# encoding: utf-8
require "logstash/plugin_mixins/aws_config/generic"

module LogStash::PluginMixins::AwsConfig::V1
  def self.included(base)
    # Make sure we require the V1 classes when including this module.
    # require 'aws-sdk' will load v2 classes.
    require "aws-sdk-v1"
    base.extend(self)
    base.send(:include, LogStash::PluginMixins::AwsConfig::Generic)
    base.setup_aws_config
  end

  public
  def setup_aws_config
    # Should we require (true) or disable (false) using SSL for communicating with the AWS API
    # The AWS SDK for Ruby defaults to SSL so we preserve that
    config :use_ssl, :validate => :boolean, :default => true
  end

  public
  def aws_options_hash
    opts = {}

    if @role_arn || @role_session_name
      @logger.warn("role_arn and role_session_name settings are not supported in the v1 plugin")
    end

    if @access_key_id.is_a?(NilClass) ^ @secret_access_key.is_a?(NilClass)
      @logger.warn("Likely config error: Only one of access_key_id or secret_access_key was provided but not both.")
    end

    if @access_key_id && @secret_access_key
      opts = {
        :access_key_id => @access_key_id,
        :secret_access_key => @secret_access_key
      }
      opts[:session_token] = @session_token if @session_token
    elsif @aws_credentials_file
      opts = YAML.load_file(@aws_credentials_file)
    end

    opts[:proxy_uri] = @proxy_uri if @proxy_uri
    opts[:use_ssl] = @use_ssl


    # The AWS SDK for Ruby doesn't know how to make an endpoint hostname from a region
    # for example us-west-1 -> foosvc.us-west-1.amazonaws.com
    # So our plugins need to know how to generate their endpoints from a region
    # Furthermore, they need to know the symbol required to set that value in the AWS SDK
    # Classes using this module must implement aws_service_endpoint(region:string)
    # which must return a hash with one key, the aws sdk for ruby config symbol of the service
    # endpoint, which has a string value of the service endpoint hostname
    # for example, CloudWatch, { :cloud_watch_endpoint => "monitoring.#{region}.amazonaws.com" }
    # For a list, see https://github.com/aws/aws-sdk-ruby/blob/master/lib/aws/core/configuration.rb
    opts.merge!(self.aws_service_endpoint(@region))

    if !@endpoint.is_a?(NilClass)
      opts[:endpoint] = @endpoint
    end

    return opts
  end # def aws_options_hash
end
