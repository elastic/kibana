# encoding: utf-8
require "logstash-filter-jdbc_static_jars"
require "logstash/filters/base"
require "logstash/namespace"
require_relative "jdbc/loader"
require_relative "jdbc/loader_schedule"
require_relative "jdbc/repeating_load_runner"
require_relative "jdbc/lookup_processor"

# This filter can do multiple enhancements to an event in one pass.
# Define multiple loader sources and multiple lookup targets.
# Currently only one remote database connection is supported.
# [source,ruby]

#
module LogStash module Filters class JdbcStatic < LogStash::Filters::Base
  config_name "jdbc_static"

  # Define the loaders, an Array of Hashes, to fetch remote data and create local tables.
  # the fetched data will be inserted into the local tables. Make sure that the
  # local table name, columns and datatypes correspond to the shape of the remote data
  # being fetched. The default for max_rows is 1 million rows. You may provide an `id`
  # For example:
  # loaders => [
  #   {
  #     id => "country_details"
  #     query => "select code, name from WORLD.COUNTRY"
  #     max_rows => 2000
  #     local_table => "country"
  #   },
  #   {
  #     id => "servers_load"
  #     query => "select id, ip, name, location from INTERNAL.SERVERS"
  #     local_table => "servers"
  #   }
  # ]
  # This is optional. You can provide a pre-populated local database server then no initial loaders are needed.
  config :loaders, :required => false, :default => [], :validate => [LogStash::Filters::Jdbc::Loader]

  # Define an array of Database Objects to create when the plugin first starts.
  # These will usually be the definitions to setup the local in-memory tables.
  # For example:
  # local_db_objects => [
  #   {name => "servers", preserve_existing => true, index_columns => ["ip"], columns => [["id", "INTEGER"], ["ip", "varchar(64)"], ["name", "varchar(64)"], ["location", "varchar(64)"]]},
  # ]
  # NOTE: Important! use `preserve_existing => true` to keep a table created and filled in a previous Logstash session. It will default to false and is unneeded if the database is not persistent.
  # NOTE: Important! Tables created here must have the same names as those used in the `loaders` and
  # `local_lookups` configuration options
  config :local_db_objects, :required => false, :default => [], :validate => [LogStash::Filters::Jdbc::DbObject]

  # Define the list (Array) of enhancement local_lookups to be applied to an event
  # Each entry is a hash of the query string, the target field and value and a
  # parameter hash. Target is overwritten if existing. Target is optional,
  # if omitted the lookup results will be written to the root of the event like this:
  # event.set(<column name (or alias)>, <column value>)
  # Use parameters to have this plugin put values from the event into the query.
  # The parameter maps the symbol used in the query string to the field name in the event.
  # NOTE: when using a query string that includes the LIKE keyword make sure that
  # you provide a Logstash Event sprintf pattern with added wildcards.
  # For example:
  # local_lookups => [
  #   {
  #     "query" => "select * from country WHERE code = :code",
  #     "parameters" => {"code" => "country_code"}
  #     "target" => "country_details"
  #   },
  #   {
  #     "query" => "select ip, name from servers WHERE ip LIKE :ip",
  #     "parameters" => {"ip" => "%{[response][ip]}%"}
  #     "target" => "servers"
  #   }
  # ]
  config :local_lookups, :required => true, :validate => [LogStash::Filters::Jdbc::LookupProcessor]

  # Schedule of when to periodically run loaders, in Cron format
  # for example: "* * * * *" (execute query every minute, on the minute)
  #
  # There is no schedule by default. If no schedule is given, then the loaders are run
  # exactly once.
  config :loader_schedule, :required => false, :validate => LogStash::Filters::Jdbc::LoaderSchedule

  # Append values to the `tags` field if sql error occured
  # Alternatively, individual `tag_on_failure` arrays can be added to each lookup hash
  config :tag_on_failure, :validate => :array, :default => ["_jdbcstaticfailure"]

  # Append values to the `tags` field if no record was found and default values were used
  config :tag_on_default_use, :validate => :array, :default => ["_jdbcstaticdefaultsused"]

  # Remote Load DB Jdbc driver library path to third party driver library.
  # Use comma separated paths in one string if you need more than one library.
  config :jdbc_driver_library, :validate => :string

  # Remote Load DB Jdbc driver class to load, for example "oracle.jdbc.OracleDriver" or "org.apache.derby.jdbc.ClientDriver"
  config :jdbc_driver_class, :validate => :string, :required => true

  # Remote Load DB Jdbc connection string
  config :jdbc_connection_string, :validate => :string, :required => true

  # Remote Load DB Jdbc user
  config :jdbc_user, :validate => :string

  # Remote Load DB Jdbc password
  config :jdbc_password, :validate => :password

  # directory for temp files created during bulk loader import.
  config :staging_directory, :validate => :string, :default => ::File.join(Dir.tmpdir, "logstash", config_name, "import_data")

  # NOTE: For the initial release, we are not allowing the user to specify their own local lookup JDBC DB settings.
  # In the near future we have to consider identical config running in multiple pipelines stomping over each other
  # when the database names are common across configs because there is only one Derby server in memory per JVM.

  # Local Lookup DB Jdbc driver class to load, for example "org.apache.derby.jdbc.ClientDriver"
  # config :lookup_jdbc_driver_class, :validate => :string, :required => false

  # Local Lookup DB Jdbc driver library path to third party driver library.
  # config :lookup_jdbc_driver_library, :validate => :path, :required => false

  # Local Lookup DB Jdbc connection string
  # config :lookup_jdbc_connection_string, :validate => :string, :required => false

  class << self
    alias_method :old_validate_value, :validate_value

    def validate_value(value, validator)
      if validator.is_a?(Array) && validator.first.respond_to?(:find_validation_errors)
        validation_errors = validator.first.find_validation_errors(value)
        unless validation_errors.nil?
          return false, validation_errors
        end
      elsif validator.respond_to?(:find_validation_errors)
        validation_errors = validator.find_validation_errors(value)
        unless validation_errors.nil?
          return false, validation_errors
        end
      else
        return old_validate_value(value, validator)
      end
      [true, value]
    end
  end

  public

  def register
    prepare_data_dir
    prepare_runner
  end

  def filter(event)
    enhancement_states = @processor.enhance(event)
    filter_matched(event) if enhancement_states.all?
  end

  def close
    @scheduler.stop if @scheduler
    @parsed_loaders.each(&:close)
    @processor.close
  end

  def loader_runner
    # use for test verification
    @loader_runner
  end

  private

  def prepare_data_dir
    # later, when local persistent databases are allowed set this property to LS_HOME/data/jdbc-static/
    # must take multi-pipelines into account and more than one config using the same jdbc-static settings
    java.lang.System.setProperty("derby.system.home", ENV["HOME"])
    logger.info("derby.system.home is: #{java.lang.System.getProperty("derby.system.home")}")
  end

  def prepare_runner
    @parsed_loaders = @loaders.map do |options|
      add_plugin_configs(options)
      loader = Jdbc::Loader.new(options)
      loader.build_remote_db
      loader
    end
    runner_args = [@parsed_loaders, @local_db_objects]
    @processor = Jdbc::LookupProcessor.new(@local_lookups, global_lookup_options)
    runner_args.unshift(@processor.local)
    if @loader_schedule
      args = []
      @loader_runner = Jdbc::RepeatingLoadRunner.new(*runner_args)
      @loader_runner.initial_load
      cronline = Jdbc::LoaderSchedule.new(@loader_schedule)
      cronline.to_log_string.tap do |msg|
        logger.info("Scheduler operations: #{msg}") unless msg.empty?
      end
      logger.info("Scheduler scan for work frequency is: #{cronline.schedule_frequency}")
      rufus_args = {:max_work_threads => 1, :frequency => cronline.schedule_frequency}
      @scheduler = Rufus::Scheduler.new(rufus_args)
      @scheduler.cron(cronline.loader_schedule, @loader_runner)
    else
      @loader_runner = Jdbc::SingleLoadRunner.new(*runner_args)
      @loader_runner.initial_load
    end
  end

  def global_lookup_options(options = Hash.new)
    if @tag_on_failure && !@tag_on_failure.empty? && !options.key?("tag_on_failure")
      options["tag_on_failure"] = @tag_on_failure
    end
    if @tag_on_default_use && !@tag_on_default_use.empty? && !options.key?("tag_on_default_use")
      options["tag_on_default_use"] = @tag_on_default_use
    end
    options["lookup_jdbc_driver_class"] = @lookup_jdbc_driver_class
    options["lookup_jdbc_driver_library"] = @lookup_jdbc_driver_library
    options["lookup_jdbc_connection_string"] = @lookup_jdbc_connection_string
    options
  end

  def add_plugin_configs(options)
    if @jdbc_driver_library
      options["jdbc_driver_library"] = @jdbc_driver_library
    end
    if @jdbc_driver_class
      options["jdbc_driver_class"] = @jdbc_driver_class
    end
    if @jdbc_connection_string
      options["jdbc_connection_string"] = @jdbc_connection_string
    end
    if @jdbc_user
      options["jdbc_user"] = @jdbc_user
    end
    if @jdbc_password
      options["jdbc_password"] = @jdbc_password
    end
    if @staging_directory
      options["staging_directory"] = @staging_directory
    end
  end
end end end
