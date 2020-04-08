# encoding: utf-8
require "logstash/namespace"
require "logstash/environment"
require "logstash/outputs/base"
require "logstash/json"
require "concurrent"
require "stud/buffer"
require "socket" # for Socket.gethostname
require "thread" # for safe queueing
require "uri" # for escaping user input
require "forwardable"

# .Compatibility Note
# [NOTE]
# ================================================================================
# Starting with Elasticsearch 5.3, there's an {ref}modules-http.html[HTTP setting]
# called `http.content_type.required`. If this option is set to `true`, and you
# are using Logstash 2.4 through 5.2, you need to update the Elasticsearch output
# plugin to version 6.2.5 or higher.
# 
# ================================================================================
#
# This plugin is the recommended method of storing logs in Elasticsearch.
# If you plan on using the Kibana web interface, you'll want to use this output.
#
# This output only speaks the HTTP protocol. HTTP is the preferred protocol for interacting with Elasticsearch as of Logstash 2.0.
# We strongly encourage the use of HTTP over the node protocol for a number of reasons. HTTP is only marginally slower,
# yet far easier to administer and work with. When using the HTTP protocol one may upgrade Elasticsearch versions without having
# to upgrade Logstash in lock-step. 
# 
# You can learn more about Elasticsearch at <https://www.elastic.co/products/elasticsearch>
#
# ==== Template management for Elasticsearch 5.x
# Index template for this version (Logstash 5.0) has been changed to reflect Elasticsearch's mapping changes in version 5.0.
# Most importantly, the subfield for string multi-fields has changed from `.raw` to `.keyword` to match ES default
# behavior.
#
# ** Users installing ES 5.x and LS 5.x **
# This change will not affect you and you will continue to use the ES defaults.
#
# ** Users upgrading from LS 2.x to LS 5.x with ES 5.x **
# LS will not force upgrade the template, if `logstash` template already exists. This means you will still use
# `.raw` for sub-fields coming from 2.x. If you choose to use the new template, you will have to reindex your data after
# the new template is installed.
#
# ==== Retry Policy
#
# The retry policy has changed significantly in the 2.2.0 release.
# This plugin uses the Elasticsearch bulk API to optimize its imports into Elasticsearch. These requests may experience
# either partial or total failures.
#
# The following errors are retried infinitely:
#
# - Network errors (inability to connect)
# - 429 (Too many requests) and
# - 503 (Service unavailable) errors
#
# NOTE: 409 exceptions are no longer retried. Please set a higher `retry_on_conflict` value if you experience 409 exceptions.
# It is more performant for Elasticsearch to retry these exceptions than this plugin.
#
# ==== Batch Sizes ====
# This plugin attempts to send batches of events as a single request. However, if
# a request exceeds 20MB we will break it up until multiple batch requests. If a single document exceeds 20MB it will be sent as a single request.
#
# ==== DNS Caching
#
# This plugin uses the JVM to lookup DNS entries and is subject to the value of https://docs.oracle.com/javase/7/docs/technotes/guides/net/properties.html[networkaddress.cache.ttl],
# a global setting for the JVM.
#
# As an example, to set your DNS TTL to 1 second you would set
# the `LS_JAVA_OPTS` environment variable to `-Dnetworkaddress.cache.ttl=1`.
#
# Keep in mind that a connection with keepalive enabled will
# not reevaluate its DNS value while the keepalive is in effect.
#
# ==== HTTP Compression
#
# This plugin supports request and response compression. Response compression is enabled by default and 
# for Elasticsearch versions 5.0 and later, the user doesn't have to set any configs in Elasticsearch for 
# it to send back compressed response. For versions before 5.0, `http.compression` must be set to `true` in 
# Elasticsearch[https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-http.html#modules-http] to take advantage of response compression when using this plugin
#
# For requests compression, regardless of the Elasticsearch version, users have to enable `http_compression` 
# setting in their Logstash config file.
#
class LogStash::Outputs::ElasticSearch < LogStash::Outputs::Base
  declare_threadsafe!

  require "logstash/outputs/elasticsearch/http_client"
  require "logstash/outputs/elasticsearch/http_client_builder"
  require "logstash/outputs/elasticsearch/common_configs"
  require "logstash/outputs/elasticsearch/common"
  require "logstash/outputs/elasticsearch/ilm"

  # Protocol agnostic (i.e. non-http, non-java specific) configs go here
  include(LogStash::Outputs::ElasticSearch::CommonConfigs)

  # Protocol agnostic methods
  include(LogStash::Outputs::ElasticSearch::Common)

  # Methods for ILM support
  include(LogStash::Outputs::ElasticSearch::Ilm)

  config_name "elasticsearch"

  # The Elasticsearch action to perform. Valid actions are:
  #
  # - index: indexes a document (an event from Logstash).
  # - delete: deletes a document by id (An id is required for this action)
  # - create: indexes a document, fails if a document by that id already exists in the index.
  # - update: updates a document by id. Update has a special case where you can upsert -- update a
  #   document if not already present. See the `upsert` option. NOTE: This does not work and is not supported
  #   in Elasticsearch 1.x. Please upgrade to ES 2.x or greater to use this feature with Logstash!
  # - A sprintf style string to change the action based on the content of the event. The value `%{[foo]}`
  #   would use the foo field for the action
  #
  # For more details on actions, check out the http://www.elastic.co/guide/en/elasticsearch/reference/current/docs-bulk.html[Elasticsearch bulk API documentation]
  config :action, :validate => :string, :default => "index"

  # Username to authenticate to a secure Elasticsearch cluster
  config :user, :validate => :string
  # Password to authenticate to a secure Elasticsearch cluster
  config :password, :validate => :password

  # HTTP Path at which the Elasticsearch server lives. Use this if you must run Elasticsearch behind a proxy that remaps
  # the root path for the Elasticsearch HTTP API lives.
  # Note that if you use paths as components of URLs in the 'hosts' field you may
  # not also set this field. That will raise an error at startup
  config :path, :validate => :string

  # HTTP Path to perform the _bulk requests to
  # this defaults to a concatenation of the path parameter and "_bulk"
  config :bulk_path, :validate => :string

  # Pass a set of key value pairs as the URL query string. This query string is added
  # to every host listed in the 'hosts' configuration. If the 'hosts' list contains
  # urls that already have query strings, the one specified here will be appended.
  config :parameters, :validate => :hash

  # Enable SSL/TLS secured communication to Elasticsearch cluster. Leaving this unspecified will use whatever scheme
  # is specified in the URLs listed in 'hosts'. If no explicit protocol is specified plain HTTP will be used.
  # If SSL is explicitly disabled here the plugin will refuse to start if an HTTPS URL is given in 'hosts'
  config :ssl, :validate => :boolean

  # Option to validate the server's certificate. Disabling this severely compromises security.
  # For more information on disabling certificate verification please read
  # https://www.cs.utexas.edu/~shmat/shmat_ccs12.pdf
  config :ssl_certificate_verification, :validate => :boolean, :default => true

  # The .cer or .pem file to validate the server's certificate
  config :cacert, :validate => :path

  # The JKS truststore to validate the server's certificate.
  # Use either `:truststore` or `:cacert`
  config :truststore, :validate => :path

  # Set the truststore password
  config :truststore_password, :validate => :password

  # The keystore used to present a certificate to the server.
  # It can be either .jks or .p12
  config :keystore, :validate => :path

  # Set the keystore password
  config :keystore_password, :validate => :password

  # This setting asks Elasticsearch for the list of all cluster nodes and adds them to the hosts list.
  # Note: This will return ALL nodes with HTTP enabled (including master nodes!). If you use
  # this with master nodes, you probably want to disable HTTP on them by setting
  # `http.enabled` to false in their elasticsearch.yml. You can either use the `sniffing` option or
  # manually enter multiple Elasticsearch hosts using the `hosts` parameter.
  config :sniffing, :validate => :boolean, :default => false

  # How long to wait, in seconds, between sniffing attempts
  config :sniffing_delay, :validate => :number, :default => 5

  # HTTP Path to be used for the sniffing requests
  # the default value is computed by concatenating the path value and "_nodes/http"
  # if sniffing_path is set it will be used as an absolute path
  # do not use full URL here, only paths, e.g. "/sniff/_nodes/http"
  config :sniffing_path, :validate => :string

  # Set the address of a forward HTTP proxy.
  # This used to accept hashes as arguments but now only accepts
  # arguments of the URI type to prevent leaking credentials.
  config :proxy, :validate => :uri

  # Set the timeout, in seconds, for network operations and requests sent Elasticsearch. If
  # a timeout occurs, the request will be retried.
  config :timeout, :validate => :number, :default => 60

  # Set the Elasticsearch errors in the whitelist that you don't want to log.
  # A useful example is when you want to skip all 409 errors
  # which are `document_already_exists_exception`.
  config :failure_type_logging_whitelist, :validate => :array, :default => []

  # While the output tries to reuse connections efficiently we have a maximum.
  # This sets the maximum number of open connections the output will create.
  # Setting this too low may mean frequently closing / opening connections
  # which is bad.
  config :pool_max, :validate => :number, :default => 1000

  # While the output tries to reuse connections efficiently we have a maximum per endpoint.
  # This sets the maximum number of open connections per endpoint the output will create.
  # Setting this too low may mean frequently closing / opening connections
  # which is bad.
  config :pool_max_per_route, :validate => :number, :default => 100

  # HTTP Path where a HEAD request is sent when a backend is marked down
  # the request is sent in the background to see if it has come back again
  # before it is once again eligible to service requests.
  # If you have custom firewall rules you may need to change this
  config :healthcheck_path, :validate => :string

  # How frequently, in seconds, to wait between resurrection attempts.
  # Resurrection is the process by which backend endpoints marked 'down' are checked
  # to see if they have come back to life
  config :resurrect_delay, :validate => :number, :default => 5

  # How long to wait before checking if the connection is stale before executing a request on a connection using keepalive.
  # You may want to set this lower, if you get connection errors regularly
  # Quoting the Apache commons docs (this client is based Apache Commmons):
  # 'Defines period of inactivity in milliseconds after which persistent connections must
  # be re-validated prior to being leased to the consumer. Non-positive value passed to
  # this method disables connection validation. This check helps detect connections that
  # have become stale (half-closed) while kept inactive in the pool.'
  # See https://hc.apache.org/httpcomponents-client-ga/httpclient/apidocs/org/apache/http/impl/conn/PoolingHttpClientConnectionManager.html#setValidateAfterInactivity(int)[these docs for more info]
  config :validate_after_inactivity, :validate => :number, :default => 10000

  # Enable gzip compression on requests. Note that response compression is on by default for Elasticsearch v5.0 and beyond
  config :http_compression, :validate => :boolean, :default => false

  # Custom Headers to send on each request to elasticsearch nodes
  config :custom_headers, :validate => :hash, :default => {}

  def build_client
    params["metric"] = metric
    @client ||= ::LogStash::Outputs::ElasticSearch::HttpClientBuilder.build(@logger, @hosts, params)
  end

  def close
    @stopping.make_true
    stop_template_installer
    @client.close if @client
  end

  def self.oss?
    LogStash::OSS
  end

  @@plugins = Gem::Specification.find_all{|spec| spec.name =~ /logstash-output-elasticsearch-/ }

  @@plugins.each do |plugin|
    name = plugin.name.split('-')[-1]
    require "logstash/outputs/elasticsearch/#{name}"
  end

end # class LogStash::Outputs::Elasticsearch
