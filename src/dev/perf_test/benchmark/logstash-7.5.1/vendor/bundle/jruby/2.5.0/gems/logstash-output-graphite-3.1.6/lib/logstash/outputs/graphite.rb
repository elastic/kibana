# encoding: utf-8
require "logstash/outputs/base"
require "logstash/namespace"
require "socket"

# This output allows you to pull metrics from your logs and ship them to
# Graphite. Graphite is an open source tool for storing and graphing metrics.
#
# An example use case: Some applications emit aggregated stats in the logs
# every 10 seconds. Using the grok filter and this output, it is possible to
# capture the metric values from the logs and emit them to Graphite.
class LogStash::Outputs::Graphite < LogStash::Outputs::Base
  config_name "graphite"

  EXCLUDE_ALWAYS = [ "@timestamp", "@version" ]

  DEFAULT_METRICS_FORMAT = "*"
  METRIC_PLACEHOLDER = "*"

  # The hostname or IP address of the Graphite server.
  config :host, :validate => :string, :default => "localhost"

  # The port to connect to on the Graphite server.
  config :port, :validate => :number, :default => 2003

  # Interval between reconnect attempts to Carbon.
  config :reconnect_interval, :validate => :number, :default => 2

  # Should metrics be resent on failure?
  config :resend_on_failure, :validate => :boolean, :default => false

  # The metric(s) to use. This supports dynamic strings like %{host}
  # for metric names and also for values. This is a hash field with key
  # being the metric name, value being the metric value. Example:
  # [source,ruby]
  #     metrics => { "%{host}/uptime" => "%{uptime_1m}" }
  #
  # The value will be coerced to a floating point value. Values which cannot be
  # coerced will be set to zero (0). You may use either `metrics` or `fields_are_metrics`,
  # but not both.
  config :metrics, :validate => :hash, :default => {}

  # An array indicating that these event fields should be treated as metrics
  # and will be sent verbatim to Graphite. You may use either `fields_are_metrics`
  # or `metrics`, but not both.
  config :fields_are_metrics, :validate => :boolean, :default => false

  # Include only regex matched metric names.
  config :include_metrics, :validate => :array, :default => [ ".*" ]

  # Exclude regex matched metric names, by default exclude unresolved %{field} strings.
  config :exclude_metrics, :validate => :array, :default => [ "%\{[^}]+\}" ]

  # Use this field for the timestamp instead of '@timestamp' which is the
  # default. Useful when backfilling or just getting more accurate data into
  # graphite since you probably have a cache layer infront of Logstash.
  config :timestamp_field, :validate => :string, :default => '@timestamp'

  # Defines the format of the metric string. The placeholder '*' will be
  # replaced with the name of the actual metric.
  # [source,ruby]
  #     metrics_format => "foo.bar.*.sum"
  #
  # NOTE: If no metrics_format is defined, the name of the metric will be used as fallback.
  config :metrics_format, :validate => :string, :default => DEFAULT_METRICS_FORMAT

  # When hashes are passed in as values they are broken out into a dotted notation
  # For instance if you configure this plugin with
  # # [source,ruby]
  #     metrics => "mymetrics"
  #
  # and "mymetrics" is a nested hash of '{a => 1, b => { c => 2 }}'
  # this plugin will generate two metrics: a => 1, and b.c => 2 .
  # If you've specified a 'metrics_format' it will respect that,
  # but you still may want control over the separator within these nested key names.
  # This config setting changes the separator from the '.' default.
  config :nested_object_separator, :validate => :string, :default => "."

  def register
    @include_metrics.collect!{|regexp| Regexp.new(regexp)}
    @exclude_metrics.collect!{|regexp| Regexp.new(regexp)}

    if @metrics_format && !@metrics_format.include?(METRIC_PLACEHOLDER)
      @logger.warn("metrics_format does not include placeholder #{METRIC_PLACEHOLDER} .. falling back to default format: #{DEFAULT_METRICS_FORMAT.inspect}")

      @metrics_format = DEFAULT_METRICS_FORMAT
    end

    connect
  end

  def connect
    # TODO(sissel): Test error cases. Catch exceptions. Find fortune and glory. Retire to yak farm.
    begin
      @socket = TCPSocket.new(@host, @port)
    rescue Errno::ECONNREFUSED => e
      @logger.warn("Connection refused to graphite server, sleeping...", :host => @host, :port => @port)
      sleep(@reconnect_interval)
      retry
    end
  end

  def construct_metric_name(event, metric)
    if @metrics_format
      sprinted = event.sprintf(@metrics_format)
      return sprinted.gsub(METRIC_PLACEHOLDER, metric)
    end

    metric
  end

  def receive(event)
    # Graphite message format: metric value timestamp\n

    # compact to remove nil messages which produces useless \n
    messages = (
      @fields_are_metrics \
        ? messages_from_event_fields(event, @include_metrics, @exclude_metrics)
        : messages_from_event_metrics(event, @metrics)
    ).compact

    if messages.empty?
      @logger.debug? && @logger.debug("Message is empty, not sending anything to Graphite", :messages => messages, :host => @host, :port => @port)
    else
      message = messages.join("\n")
      @logger.debug? && @logger.debug("Sending carbon messages", :messages => messages, :host => @host, :port => @port)

      # Catch exceptions like ECONNRESET and friends, reconnect on failure.
      # TODO(sissel): Test error cases. Catch exceptions. Find fortune and glory.
      begin
        @socket.puts(message)
      rescue Errno::EPIPE, Errno::ECONNRESET, IOError => e
        @logger.warn("Connection to graphite server died", :exception => e.class, :message => e.message, :host => @host, :port => @port)
        sleep(@reconnect_interval)
        connect
        retry if @resend_on_failure
      rescue => e
        @logger.warn("Failed to send data", :exception => e.class, :message => e.message, :host => @host, :port => @port)
        sleep(@reconnect_interval)
        connect
        retry if @resend_on_failure
      end
    end
  end

  private

  def messages_from_event_fields(event, include_metrics, exclude_metrics)
    @logger.debug? && @logger.debug("got metrics event", :metrics => event.to_hash)

    timestamp = event_timestamp(event)
    event.to_hash.flat_map do |metric,value|
      next if EXCLUDE_ALWAYS.include?(metric)
      next unless include_metrics.empty? || include_metrics.any? { |regexp| metric.match(regexp) }
      next if exclude_metrics.any? {|regexp| metric.match(regexp)}

      metrics_lines_for_event(event, metric, value, timestamp)
    end
  end

  def messages_from_event_metrics(event, metrics)
    timestamp = event_timestamp(event)
    metrics.flat_map do |metric, value|
      @logger.debug? && @logger.debug("processing", :metric => metric, :value => value)

      metric = event.sprintf(metric)
      next unless @include_metrics.any? {|regexp| metric.match(regexp)}
      next if @exclude_metrics.any? {|regexp| metric.match(regexp)}

      metrics_lines_for_event(event, metric, value, timestamp)
    end
  end

  def event_timestamp(event)
    event.get(@timestamp_field).to_i
  end

  def metrics_lines_for_event(event, metric, value, timestamp)
    if event.get(metric).is_a?(Hash)
      dotify(event.get(metric), metric).map do |k, v|
        metrics_line(event, k, v, timestamp)
      end
    else
      metrics_line(event, event.sprintf(metric), event.sprintf(value).to_f, timestamp)
    end
  end

  def metrics_line(event, name, value, timestamp)
    "#{construct_metric_name(event, name)} #{value} #{timestamp}"
  end

  # Take a nested ruby hash of the form {:a => {:b => 2}, c: => 3} and
  # turn it into a hash of the form
  # { "a.b" => 2, "c" => 3}
  def dotify(hash, prefix = nil)
    hash.reduce({}) do |acc, kv|
      k, v = kv
      pk = prefix ? "#{prefix}#{@nested_object_separator}#{k}" : k.to_s
      if v.is_a?(Hash)
        acc.merge!(dotify(v, pk))
      elsif v.is_a?(Array)
        # There's no right answer here, so we do nothing
        @logger.warn("Array values not supported for graphite metrics! Ignoring #{hash} @ #{prefix}")
      else
        acc[pk] = v
      end
      acc
    end
  end
end
