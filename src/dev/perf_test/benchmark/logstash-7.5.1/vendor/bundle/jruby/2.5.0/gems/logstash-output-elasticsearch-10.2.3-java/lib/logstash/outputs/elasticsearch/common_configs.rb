require 'forwardable' # Needed for logstash core SafeURI. We need to patch this in core: https://github.com/elastic/logstash/pull/5978

module LogStash; module Outputs; class ElasticSearch
  module CommonConfigs

    DEFAULT_INDEX_NAME = "logstash-%{+YYYY.MM.dd}"
    DEFAULT_POLICY = "logstash-policy"
    DEFAULT_ROLLOVER_ALIAS = 'logstash'

    def self.included(mod)
      # The index to write events to. This can be dynamic using the `%{foo}` syntax.
      # The default value will partition your indices by day so you can more easily
      # delete old data or only search specific date ranges.
      # Indexes may not contain uppercase characters.
      # For weekly indexes ISO 8601 format is recommended, eg. logstash-%{+xxxx.ww}.
      # LS uses Joda to format the index pattern from event timestamp.
      # Joda formats are defined http://www.joda.org/joda-time/apidocs/org/joda/time/format/DateTimeFormat.html[here].
      mod.config :index, :validate => :string, :default => DEFAULT_INDEX_NAME

      mod.config :document_type, 
        :validate => :string, 
        :deprecated => "Document types are being deprecated in Elasticsearch 6.0, and removed entirely in 7.0. You should avoid this feature"

      # From Logstash 1.3 onwards, a template is applied to Elasticsearch during
      # Logstash's startup if one with the name `template_name` does not already exist.
      # By default, the contents of this template is the default template for
      # `logstash-%{+YYYY.MM.dd}` which always matches indices based on the pattern
      # `logstash-*`.  Should you require support for other index names, or would like
      # to change the mappings in the template in general, a custom template can be
      # specified by setting `template` to the path of a template file.
      #
      # Setting `manage_template` to false disables this feature.  If you require more
      # control over template creation, (e.g. creating indices dynamically based on
      # field names) you should set `manage_template` to false and use the REST
      # API to apply your templates manually.
      mod.config :manage_template, :validate => :boolean, :default => true

      # This configuration option defines how the template is named inside Elasticsearch.
      # Note that if you have used the template management features and subsequently
      # change this, you will need to prune the old template manually, e.g.
      #
      # `curl -XDELETE <http://localhost:9200/_template/OldTemplateName?pretty>`
      #
      # where `OldTemplateName` is whatever the former setting was.
      mod.config :template_name, :validate => :string, :default => "logstash"

      # You can set the path to your own template here, if you so desire.
      # If not set, the included template will be used.
      mod.config :template, :validate => :path

      # The template_overwrite option will always overwrite the indicated template
      # in Elasticsearch with either the one indicated by template or the included one.
      # This option is set to false by default. If you always want to stay up to date
      # with the template provided by Logstash, this option could be very useful to you.
      # Likewise, if you have your own template file managed by puppet, for example, and
      # you wanted to be able to update it regularly, this option could help there as well.
      #
      # Please note that if you are using your own customized version of the Logstash
      # template (logstash), setting this to true will make Logstash to overwrite
      # the "logstash" template (i.e. removing all customized settings)
      mod.config :template_overwrite, :validate => :boolean, :default => false

      # The document ID for the index. Useful for overwriting existing entries in
      # Elasticsearch with the same ID.
      mod.config :document_id, :validate => :string

      # The version to use for indexing. Use sprintf syntax like `%{my_version}` to use a field value here.
      # See https://www.elastic.co/blog/elasticsearch-versioning-support.
      mod.config :version, :validate => :string
      
      # The version_type to use for indexing.
      # See https://www.elastic.co/blog/elasticsearch-versioning-support.
      # See also https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-index_.html#_version_types
      mod.config :version_type, :validate => ["internal", 'external', "external_gt", "external_gte", "force"]

      # A routing override to be applied to all processed events.
      # This can be dynamic using the `%{foo}` syntax.
      mod.config :routing, :validate => :string

      # For child documents, ID of the associated parent.
      # This can be dynamic using the `%{foo}` syntax.
      mod.config :parent, :validate => :string, :default => nil

      # For child documents, name of the join field
      mod.config :join_field, :validate => :string, :default => nil

      # Sets the host(s) of the remote instance. If given an array it will load balance requests across the hosts specified in the `hosts` parameter.
      # Remember the `http` protocol uses the http://www.elastic.co/guide/en/elasticsearch/reference/current/modules-http.html#modules-http[http] address (eg. 9200, not 9300).
      #     `"127.0.0.1"`
      #     `["127.0.0.1:9200","127.0.0.2:9200"]`
      #     `["http://127.0.0.1"]`
      #     `["https://127.0.0.1:9200"]`
      #     `["https://127.0.0.1:9200/mypath"]` (If using a proxy on a subpath)
      # It is important to exclude http://www.elastic.co/guide/en/elasticsearch/reference/current/modules-node.html[dedicated master nodes] from the `hosts` list
      # to prevent LS from sending bulk requests to the master nodes.  So this parameter should only reference either data or client nodes in Elasticsearch.
      # 
      # Any special characters present in the URLs here MUST be URL escaped! This means `#` should be put in as `%23` for instance.
      mod.config :hosts, :validate => :uri, :default => [::LogStash::Util::SafeURI.new("//127.0.0.1")], :list => true

      # Set upsert content for update mode.s
      # Create a new document with this parameter as json string if `document_id` doesn't exists
      mod.config :upsert, :validate => :string, :default => ""

      # Enable `doc_as_upsert` for update mode.
      # Create a new document with source if `document_id` doesn't exist in Elasticsearch
      mod.config :doc_as_upsert, :validate => :boolean, :default => false

      # Set script name for scripted update mode
      mod.config :script, :validate => :string, :default => ""

      # Define the type of script referenced by "script" variable
      #  inline : "script" contains inline script
      #  indexed : "script" contains the name of script directly indexed in elasticsearch
      #  file    : "script" contains the name of script stored in elasticseach's config directory
      mod.config :script_type, :validate => ["inline", 'indexed', "file"], :default => ["inline"]

      # Set the language of the used script. If not set, this defaults to painless in ES 5.0
      mod.config :script_lang, :validate => :string, :default => "painless"

      # Set variable name passed to script (scripted update)
      mod.config :script_var_name, :validate => :string, :default => "event"

      # if enabled, script is in charge of creating non-existent document (scripted update)
      mod.config :scripted_upsert, :validate => :boolean, :default => false

      # Set initial interval in seconds between bulk retries. Doubled on each retry up to `retry_max_interval`
      mod.config :retry_initial_interval, :validate => :number, :default => 2

      # Set max interval in seconds between bulk retries.
      mod.config :retry_max_interval, :validate => :number, :default => 64

      # The number of times Elasticsearch should internally retry an update/upserted document
      # See the https://www.elastic.co/guide/en/elasticsearch/guide/current/partial-updates.html[partial updates]
      # for more info
      mod.config :retry_on_conflict, :validate => :number, :default => 1

      # Set which ingest pipeline you wish to execute for an event. You can also use event dependent configuration
      # here like `pipeline => "%{INGEST_PIPELINE}"`
      mod.config :pipeline, :validate => :string, :default => nil


      # -----
      # ILM configurations (beta)
      # -----
      # Flag for enabling Index Lifecycle Management integration.
      mod.config :ilm_enabled, :validate => [true, false, 'true', 'false', 'auto'], :default => 'auto'

      # Rollover alias used for indexing data. If rollover alias doesn't exist, Logstash will create it and map it to the relevant index
      mod.config :ilm_rollover_alias, :validate => :string, :default => DEFAULT_ROLLOVER_ALIAS

      # appends “{now/d}-000001” by default for new index creation, subsequent rollover indices will increment based on this pattern i.e. “000002”
      # {now/d} is date math, and will insert the appropriate value automatically.
      mod.config :ilm_pattern, :validate => :string, :default => '{now/d}-000001'

      # ILM policy to use, if undefined the default policy will be used.
      mod.config :ilm_policy, :validate => :string, :default => DEFAULT_POLICY

    end
  end
end end end
