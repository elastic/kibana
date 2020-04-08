# encoding: utf-8
require "logstash/plugin_mixins/aws_config/generic"

module LogStash::PluginMixins::AwsConfig::V2
  def self.included(base)
    base.extend(self)
    base.send(:include, LogStash::PluginMixins::AwsConfig::Generic)
  end

  public
  def aws_options_hash
    opts = {}

    if @access_key_id.is_a?(NilClass) ^ @secret_access_key.is_a?(NilClass)
      @logger.warn("Likely config error: Only one of access_key_id or secret_access_key was provided but not both.")
    end

    opts[:credentials] = credentials if credentials

    opts[:http_proxy] = @proxy_uri if @proxy_uri

    # The AWS SDK for Ruby doesn't know how to make an endpoint hostname from a region
    # for example us-west-1 -> foosvc.us-west-1.amazonaws.com
    # So our plugins need to know how to generate their endpoints from a region
    # Furthermore, they need to know the symbol required to set that value in the AWS SDK
    # Classes using this module must implement aws_service_endpoint(region:string)
    # which must return a hash with one key, the aws sdk for ruby config symbol of the service
    # endpoint, which has a string value of the service endpoint hostname
    # for example, CloudWatch, { :cloud_watch_endpoint => "monitoring.#{region}.amazonaws.com" }
    # For a list, see https://github.com/aws/aws-sdk-ruby/blob/master/lib/aws/core/configuration.rb
    if self.respond_to?(:aws_service_endpoint)
      opts.merge!(self.aws_service_endpoint(@region))
    else
      opts.merge!({ :region => @region })
    end

    if !@endpoint.is_a?(NilClass)
      opts[:endpoint] = @endpoint
    end

    return opts
  end

  private
  def credentials
    @creds ||= begin
                 if @access_key_id && @secret_access_key
                   credentials_opts = {
                     :access_key_id => @access_key_id,
                     :secret_access_key => @secret_access_key.value
                   }

                   credentials_opts[:session_token] = @session_token.value if @session_token
                   Aws::Credentials.new(credentials_opts[:access_key_id],
                                        credentials_opts[:secret_access_key],
                                        credentials_opts[:session_token])
                 elsif @aws_credentials_file
                   credentials_opts = YAML.load_file(@aws_credentials_file)
                   Aws::Credentials.new(credentials_opts[:access_key_id],
                                        credentials_opts[:secret_access_key],
                                        credentials_opts[:session_token])
                 elsif @role_arn
                   assume_role
                 end
               end
  end

  def assume_role
    Aws::AssumeRoleCredentials.new(
      :client => Aws::STS::Client.new(:region => @region),
      :role_arn => @role_arn,
      :role_session_name => @role_session_name
    )
  end
end
