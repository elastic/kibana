# encoding: utf-8

module LogStash; module PluginManager

  # Centralised messaging about installing and removing x-pack, which is no longer a plugin, but
  # part of the distribution.
  module XPackInterceptor

    module Install
      extend self

      def intercept!(plugin_name_or_path)
        return unless plugin_name_or_path.downcase == 'x-pack'

        if Environment.oss_only?
          $stderr.puts <<~MESSAGE
            You are using the OSS-only distribution of Logstash. As of version 6.3+ X-Pack
            is bundled in the standard distribution of this software by default;
            consequently it is no longer available as a plugin. Please use the standard
            distribution of Logstash if you wish to use X-Pack features.
          MESSAGE
        else
          $stderr.puts <<~MESSAGE
            Logstash now contains X-Pack by default, there is no longer any need to install
            it as it is already present.
          MESSAGE
        end

        raise LogStash::PluginManager::InvalidPackError.new('x-pack not an installable plugin')
      end
    end

    module Remove
      extend self

      def intercept!(plugin_name)
        return unless plugin_name.downcase == 'x-pack'
        return if Environment.oss_only?

        $stderr.puts <<~MESSAGE
          As of 6.3+ X-Pack is part of the default distribution and cannot be uninstalled;
          to remove all X-Pack features, you must install the OSS-only distribution of
          Logstash.
        MESSAGE

        raise LogStash::PluginManager::InvalidPackError.new('x-pack not a removable plugin')
      end
    end
  end
end; end
