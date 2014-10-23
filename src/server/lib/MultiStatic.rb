require "rack/file"

PATH_INFO = 'PATH_INFO'

module Kibana
  class MultiStatic
    def initialize(app, options={})
      @app = app
      @prefix = options[:prefix] || '/'
      @servers = (options[:paths] || []).map {|p| Rack::File.new(File.expand_path(p)) }
    end

    def call(env)
      resp = nil
      orig_path = env[PATH_INFO]

      if orig_path.start_with? @prefix
        env[PATH_INFO] = orig_path.sub @prefix, '/'
      else
        return @app.call(env)
      end

      @servers.each do |server|
        resp = server.call(env)

        resp = nil if resp[0] == 404
        break if resp
      end

      return resp if resp

      env[PATH_INFO] = orig_path
      @app.call(env)
    end
  end
end