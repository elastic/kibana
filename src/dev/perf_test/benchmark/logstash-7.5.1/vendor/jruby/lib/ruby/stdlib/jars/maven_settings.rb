require 'rubygems/uri_formatter'
module Jars
  class MavenSettings
    LINE_SEPARATOR = ENV_JAVA['line.separator']

    class << self
      def local_settings
        unless instance_variable_defined?(:@_jars_maven_local_settings_)
          @_jars_maven_local_settings_ = nil
        end
        if @_jars_maven_local_settings_.nil?
          if settings = Jars.absolute('settings.xml')
            @_jars_maven_local_settings_ = settings if File.exist?(settings)
          end
        end
        @_jars_maven_local_settings_ || nil
      end

      def user_settings
        unless instance_variable_defined?(:@_jars_maven_user_settings_)
          @_jars_maven_user_settings_ = nil
        end
        if @_jars_maven_user_settings_.nil?
          if settings = Jars.absolute(Jars.to_prop(MAVEN_SETTINGS))
            unless File.exist?(settings)
              Jars.warn { "configured ENV['#{MAVEN_SETTINGS}'] = '#{settings}' not found" }
              settings = false
            end
          else # use maven default (user) settings
            settings = File.join(Jars.user_home, '.m2', 'settings.xml')
            settings = false unless File.exist?(settings)
          end
          @_jars_maven_user_settings_ = settings
        end
        @_jars_maven_user_settings_ || nil
      end

      def effective_settings
        unless instance_variable_defined?(:@_jars_effective_maven_settings_)
          @_jars_effective_maven_settings_ = nil
        end
        if @_jars_effective_maven_settings_.nil?
          begin
            require 'rubygems/request'

            http = Gem::Request.proxy_uri(Gem.configuration[:http_proxy] || Gem::Request.get_proxy_from_env('http'))
            https = Gem::Request.proxy_uri(Gem.configuration[:https_proxy] || Gem::Request.get_proxy_from_env('https'))
          rescue
            Jars.debug('ignore rubygems proxy configuration as rubygems is too old')
          end
          if http.nil? && https.nil?
            @_jars_effective_maven_settings_ = settings
          else
            @_jars_effective_maven_settings_ =
              setup_interpolated_settings(http, https) || settings
          end
        end
        @_jars_effective_maven_settings_
      end

      def cleanup
        File.unlink(effective_settings) if effective_settings != settings
      ensure
        reset
      end

      def reset
        instance_variables.each { |var| instance_variable_set(var, nil) }
      end

      def settings
        unless instance_variable_defined?(:@_jars_maven_settings_)
          @_jars_maven_settings_ = nil
        end
        local_settings || user_settings if @_jars_maven_settings_.nil?
      end

      def global_settings
        unless instance_variable_defined?(:@_jars_maven_global_settings_)
          @_jars_maven_global_settings_ = nil
        end
        if @_jars_maven_global_settings_.nil?
          if mvn_home = ENV['M2_HOME'] || ENV['MAVEN_HOME']
            settings = File.join(mvn_home, 'conf/settings.xml')
            settings = false unless File.exist?(settings)
          else
            settings = false
          end
          @_jars_maven_global_settings_ = settings
        end
        @_jars_maven_global_settings_ || nil
      end

      private

      def setup_interpolated_settings(http, https)
        proxy = raw_proxy_settings_xml(http, https).gsub("\n", LINE_SEPARATOR)
        if settings.nil?
          raw = "<settings>#{LINE_SEPARATOR}#{proxy}</settings>"
        else
          raw = File.read(settings)
          if raw.include?('<proxy>')
            Jars.warn("can not interpolated proxy info for #{settings}")
            return
          else
            raw.sub!('<settings>', "<settings>#{LINE_SEPARATOR}#{proxy}")
          end
        end
        tempfile = java.io.File.create_temp_file('settings', '.xml')
        tempfile.delete_on_exit
        File.write(tempfile.path, raw)
        tempfile.path
      end

      def raw_proxy_settings_xml(http, https)
        raw = File.read(File.join(File.dirname(__FILE__), 'settings.xml'))
        if http
          raw.sub!('__HTTP_ACTIVE__', 'true')
          raw.sub!('__HTTP_SERVER__', http.host)
          raw.sub!('__HTTP_PORT__', http.port.to_s)
        else
          raw.sub!('__HTTP_ACTIVE__', 'false')
        end
        if https
          raw.sub!('__HTTPS_ACTIVE__', 'true')
          raw.sub!('__HTTPS_SERVER__', https.host)
          raw.sub!('__HTTPS_PORT__', https.port.to_s)
        else
          raw.sub!('__HTTPS_ACTIVE__', 'false')
        end
        raw
      end
    end
  end
end
