# encoding: utf-8
require "logstash/filters/base"
require "logstash/namespace"

require "logstash-filter-geoip_jars"

# The GeoIP filter adds information about the geographical location of IP addresses,
# based on data from the Maxmind GeoLite2 database.
#
# A `[geoip][location]` field is created if
# the GeoIP lookup returns a latitude and longitude. The field is stored in
# http://geojson.org/geojson-spec.html[GeoJSON] format. Additionally,
# the default Elasticsearch template provided with the
# <<plugins-outputs-elasticsearch,`elasticsearch` output>> maps
# the `[geoip][location]` field to an http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/mapping-geo-point-type.html#_mapping_options[Elasticsearch geo_point].
#
# As this field is a `geo_point` _and_ it is still valid GeoJSON, you get
# the awesomeness of Elasticsearch's geospatial query, facet and filter functions
# and the flexibility of having GeoJSON for all other applications (like Kibana's
# map visualization).
#
# [NOTE]
# --
# This product includes GeoLite2 data created by MaxMind, available from
# http://www.maxmind.com. This database is licensed under
# http://creativecommons.org/licenses/by-sa/4.0/[Creative Commons Attribution-ShareAlike 4.0 International License].
#
# Versions 4.0.0 and later of the GeoIP filter use the MaxMind GeoLite2 database
# and support both IPv4 and IPv6 lookups. Versions prior to 4.0.0 use the legacy
# MaxMind GeoLite database and support IPv4 lookups only.
# --

class LogStash::Filters::GeoIP < LogStash::Filters::Base
  config_name "geoip"

  # The path to the GeoLite2 database file which Logstash should use. City and ASN databases are supported.
  #
  # If not specified, this will default to the GeoLite2 City database that ships
  # with Logstash.
  config :database, :validate => :path

  # If using the default database, which type should Logstash use.  Valid values are "City" and "ASN", and case matters.
  config :default_database_type, :validate => ["City","ASN"], :default => "City"

  # The field containing the IP address or hostname to map via geoip. If
  # this field is an array, only the first value will be used.
  config :source, :validate => :string, :required => true

  # An array of geoip fields to be included in the event.
  #
  # Possible fields depend on the database type. By default, all geoip fields
  # are included in the event.
  #
  # For the built-in GeoLite2 City database, the following are available:
  # `city_name`, `continent_code`, `country_code2`, `country_code3`, `country_name`,
  # `dma_code`, `ip`, `latitude`, `longitude`, `postal_code`, `region_name` and `timezone`.
  config :fields, :validate => :array

  # Specify the field into which Logstash should store the geoip data.
  # This can be useful, for example, if you have `src_ip` and `dst_ip` fields and
  # would like the GeoIP information of both IPs.
  #
  # If you save the data to a target field other than `geoip` and want to use the
  # `geo_point` related functions in Elasticsearch, you need to alter the template
  # provided with the Elasticsearch output and configure the output to use the
  # new template.
  #
  # Even if you don't use the `geo_point` mapping, the `[target][location]` field
  # is still valid GeoJSON.
  config :target, :validate => :string, :default => 'geoip'

  # GeoIP lookup is surprisingly expensive. This filter uses an cache to take advantage of the fact that
  # IPs agents are often found adjacent to one another in log files and rarely have a random distribution.
  # The higher you set this the more likely an item is to be in the cache and the faster this filter will run.
  # However, if you set this too high you can use more memory than desired.
  # Since the Geoip API upgraded to v2, there is not any eviction policy so far, if cache is full, no more record can be added.
  # Experiment with different values for this option to find the best performance for your dataset.
  #
  # This MUST be set to a value > 0. There is really no reason to not want this behavior, the overhead is minimal
  # and the speed gains are large.
  #
  # It is important to note that this config value is global to the geoip_type. That is to say all instances of the geoip filter
  # of the same geoip_type share the same cache. The last declared cache size will 'win'. The reason for this is that there would be no benefit
  # to having multiple caches for different instances at different points in the pipeline, that would just increase the
  # number of cache misses and waste memory.
  config :cache_size, :validate => :number, :default => 1000

  # Tags the event on failure to look up geo information. This can be used in later analysis.
  config :tag_on_failure, :validate => :array, :default => ["_geoip_lookup_failure"]

  public
  def register
    if @database.nil?
      @database = ::Dir.glob(::File.join(::File.expand_path("../../../vendor/", ::File.dirname(__FILE__)),"GeoLite2-#{@default_database_type}.mmdb")).first

      if @database.nil? || !File.exists?(@database)
        raise "You must specify 'database => ...' in your geoip filter (I looked for '#{@database}')"
      end
    end

    @logger.info("Using geoip database", :path => @database)
    
    @geoipfilter = org.logstash.filters.GeoIPFilter.new(@source, @target, @fields, @database, @cache_size)
  end # def register

  public
  def filter(event)
    return unless filter?(event)
    if @geoipfilter.handleEvent(event)
      filter_matched(event)
    else
      tag_unsuccessful_lookup(event)
    end
  end

  def tag_unsuccessful_lookup(event)
    @logger.debug? && @logger.debug("IP #{event.get(@source)} was not found in the database", :event => event)
    @tag_on_failure.each{|tag| event.tag(tag)}
  end

end # class LogStash::Filters::GeoIP
