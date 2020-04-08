# encoding: utf-8
require "logstash/codecs/base"
require "logstash/codecs/line"
require "logstash/timestamp"

# This codec will encode and decode Graphite formated lines.
class LogStash::Codecs::Graphite < LogStash::Codecs::Base
  config_name "graphite"


  EXCLUDE_ALWAYS = [ "@timestamp", "@version" ]

  DEFAULT_METRICS_FORMAT = "*"
  METRIC_PLACEHOLDER = "*"

  # The metric(s) to use. This supports dynamic strings like `%{host}`
  # for metric names and also for values. This is a hash field with key
  # of the metric name, value of the metric value. Example:
  # [source,ruby]
  #     [ "%{host}/uptime", "%{uptime_1m}" ]
  #
  # The value will be coerced to a floating point value. Values which cannot be
  # coerced will zero (0)
  config :metrics, :validate => :hash, :default => {}

  # Indicate that the event @fields should be treated as metrics and will be sent as is to graphite
  config :fields_are_metrics, :validate => :boolean, :default => false

  # Include only regex matched metric names
  config :include_metrics, :validate => :array, :default => [ ".*" ]

  # Exclude regex matched metric names, by default exclude unresolved %{field} strings
  config :exclude_metrics, :validate => :array, :default => [ "%\{[^}]+\}" ]

  # Defines format of the metric string. The placeholder `*` will be
  # replaced with the name of the actual metric. This supports dynamic
  # strings like `%{host}`.
  # [source,ruby]
  #     metrics_format => "%{host}.foo.bar.*.sum"
  #
  # NOTE: If no metrics_format is defined the name of the metric will be used as fallback.
  config :metrics_format, :validate => :string, :default => DEFAULT_METRICS_FORMAT


  public
  def initialize(params={})
    super(params)
    @lines = LogStash::Codecs::Line.new
  end

  public
  def decode(data)
    @lines.decode(data) do |event|
      name, value, time = event.get("message").split(" ")
      yield LogStash::Event.new(name => value.to_f, LogStash::Event::TIMESTAMP => LogStash::Timestamp.at(time.to_i))
    end # @lines.decode
  end # def decode

  private
  def construct_metric_name(metric)
    if @metrics_format
      return @metrics_format.gsub(METRIC_PLACEHOLDER, metric)
    end

    return metric
  end

  public
  def encode(event)
    # Graphite message format: metric value timestamp\n

    messages = []
    timestamp = event.sprintf("%{+%s}")
    @metrics_format = event.sprintf(@metrics_format)

    if @fields_are_metrics
      @logger.debug("got metrics event", :metrics => event.to_hash)
      event.to_hash.each do |metric,value|
        next if EXCLUDE_ALWAYS.include?(metric)
        next unless @include_metrics.empty? || @include_metrics.any? { |regexp| metric.match(regexp) }
        next if @exclude_metrics.any? {|regexp| metric.match(regexp)}
        messages << "#{construct_metric_name(metric)} #{event.sprintf(value.to_s).to_f} #{timestamp}"
      end # data.to_hash.each
    else
      @metrics.each do |metric, value|
        @logger.debug("processing", :metric => metric, :value => value)
        metric = event.sprintf(metric)
        next unless @include_metrics.any? {|regexp| metric.match(regexp)}
        next if @exclude_metrics.any? {|regexp| metric.match(regexp)}
        messages << "#{construct_metric_name(event.sprintf(metric))} #{event.sprintf(value).to_f} #{timestamp}"
      end # @metrics.each
    end # if @fields_are_metrics

    if messages.empty?
      @logger.debug("Message is empty, not emiting anything.", :messages => messages)
    else
      message = messages.join(NL) + NL
      @logger.debug("Emiting carbon messages", :messages => messages)

      @on_event.call(event, message)
    end # if messages.empty?
  end # def encode

end # class LogStash::Codecs::Graphite
