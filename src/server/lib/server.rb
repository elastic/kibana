require "rubygems"
require "bundler/setup"
require "puma"
require "colorize"
require "json"
require "#{Kibana.global_settings[:root]}/lib/app"

# Require the application
module Kibana
  module Server

    DEFAULTS = {
      :host => '0.0.0.0',
      :port => 5601,
      :threads => '0:16',
      :verbose => false
    }

    def self.log(msg)
      return if Kibana.global_settings[:quiet]
      if ENV['RACK_ENV'] == 'production'
        data = {
          "@timestamp" => Time.now.iso8601,
          :level => 'INFO',
          :name => 'Kibana',
          :message => msg
        }
        puts data.to_json
      else
        message = (Time.now.strftime('%b %d, %Y @ %H:%M:%S.%L')).light_black << ' '
        message << msg.yellow
        puts message
      end
    end

    def self.run(options = {})

      options = DEFAULTS.merge(options)
      min, max = options[:threads].split(':', 2)

      app = Kibana::App.new()
      server = Puma::Server.new(app)

      # Configure server
      begin
        server.add_tcp_listener(options[:host], options[:port])
      rescue Errno::EADDRINUSE
        log("tcp://#{options[:host]}:#{options[:port]} is in use")
        exit(1)
      end

      server.min_threads = min
      server.max_threads = max

      begin
        log("Kibana server started on tcp://#{options[:host]}:#{options[:port]} in #{ENV['RACK_ENV']} mode.")
        server.run.join
      rescue Interrupt
        log("Kibana server gracefully stopping, waiting for requests to finish")
        server.stop(true)
        log("Kibana server stopped.")
      end

    end

  end
end

