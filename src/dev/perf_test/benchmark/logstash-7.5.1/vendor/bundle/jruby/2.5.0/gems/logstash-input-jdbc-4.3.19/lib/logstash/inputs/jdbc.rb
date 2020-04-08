# encoding: utf-8
require "logstash/inputs/base"
require "logstash/namespace"
require "logstash/plugin_mixins/jdbc/jdbc"

# this require_relative returns early unless the JRuby version is between 9.2.0.0 and 9.2.8.0
require_relative "tzinfo_jruby_patch"

# This plugin was created as a way to ingest data from any database
# with a JDBC interface into Logstash. You can periodically schedule ingestion
# using a cron syntax (see `schedule` setting) or run the query one time to load
# data into Logstash. Each row in the resultset becomes a single event.
# Columns in the resultset are converted into fields in the event.
#
# ==== Drivers
#
# This plugin does not come packaged with JDBC driver libraries. The desired
# jdbc driver library must be explicitly passed in to the plugin using the
# `jdbc_driver_library` configuration option.
#
# ==== Scheduling
#
# Input from this plugin can be scheduled to run periodically according to a specific
# schedule. This scheduling syntax is powered by https://github.com/jmettraux/rufus-scheduler[rufus-scheduler].
# The syntax is cron-like with some extensions specific to Rufus (e.g. timezone support ).
#
# Examples:
#
# |==========================================================
# | `* 5 * 1-3 *`               | will execute every minute of 5am every day of January through March.
# | `0 * * * *`                 | will execute on the 0th minute of every hour every day.
# | `0 6 * * * America/Chicago` | will execute at 6:00am (UTC/GMT -5) every day.
# |==========================================================
#
#
# Further documentation describing this syntax can be found https://github.com/jmettraux/rufus-scheduler#parsing-cronlines-and-time-strings[here].
#
# ==== State
#
# The plugin will persist the `sql_last_value` parameter in the form of a
# metadata file stored in the configured `last_run_metadata_path`. Upon query execution,
# this file will be updated with the current value of `sql_last_value`. Next time
# the pipeline starts up, this value will be updated by reading from the file. If
# `clean_run` is set to true, this value will be ignored and `sql_last_value` will be
# set to Jan 1, 1970, or 0 if `use_column_value` is true, as if no query has ever been executed.
#
# ==== Dealing With Large Result-sets
#
# Many JDBC drivers use the `fetch_size` parameter to limit how many
# results are pre-fetched at a time from the cursor into the client's cache
# before retrieving more results from the result-set. This is configured in
# this plugin using the `jdbc_fetch_size` configuration option. No fetch size
# is set by default in this plugin, so the specific driver's default size will
# be used.
#
# ==== Usage:
#
# Here is an example of setting up the plugin to fetch data from a MySQL database.
# First, we place the appropriate JDBC driver library in our current
# path (this can be placed anywhere on your filesystem). In this example, we connect to
# the 'mydb' database using the user: 'mysql' and wish to input all rows in the 'songs'
# table that match a specific artist. The following examples demonstrates a possible
# Logstash configuration for this. The `schedule` option in this example will
# instruct the plugin to execute this input statement on the minute, every minute.
#
# [source,ruby]
# ------------------------------------------------------------------------------
# input {
#   jdbc {
#     jdbc_driver_library => "mysql-connector-java-5.1.36-bin.jar"
#     jdbc_driver_class => "com.mysql.jdbc.Driver"
#     jdbc_connection_string => "jdbc:mysql://localhost:3306/mydb"
#     jdbc_user => "mysql"
#     parameters => { "favorite_artist" => "Beethoven" }
#     schedule => "* * * * *"
#     statement => "SELECT * from songs where artist = :favorite_artist"
#   }
# }
# ------------------------------------------------------------------------------
#
# ==== Configuring SQL statement
#
# A sql statement is required for this input. This can be passed-in via a
# statement option in the form of a string, or read from a file (`statement_filepath`). File
# option is typically used when the SQL statement is large or cumbersome to supply in the config.
# The file option only supports one SQL statement. The plugin will only accept one of the options.
# It cannot read a statement from a file as well as from the `statement` configuration parameter.
#
# ==== Configuring multiple SQL statements
#
# Configuring multiple SQL statements is useful when there is a need to query and ingest data
# from different database tables or views. It is possible to define separate Logstash
# configuration files for each statement or to define multiple statements in a single configuration
# file. When using multiple statements in a single Logstash configuration file, each statement
# has to be defined as a separate jdbc input (including jdbc driver, connection string and other
# required parameters).
#
# Please note that if any of the statements use the `sql_last_value` parameter (e.g. for
# ingesting only data changed since last run), each input should define its own
# `last_run_metadata_path` parameter. Failure to do so will result in undesired behaviour, as
# all inputs will store their state to the same (default) metadata file, effectively
# overwriting each other's `sql_last_value`.
#
# ==== Predefined Parameters
#
# Some parameters are built-in and can be used from within your queries.
# Here is the list:
#
# |==========================================================
# |sql_last_value | The value used to calculate which rows to query. Before any query is run,
# this is set to Thursday, 1 January 1970, or 0 if `use_column_value` is true and
# `tracking_column` is set. It is updated accordingly after subsequent queries are run.
# |==========================================================
#
# Example:
# [source,ruby]
# ---------------------------------------------------------------------------------------------------
# input {
#   jdbc {
#     statement => "SELECT id, mycolumn1, mycolumn2 FROM my_table WHERE id > :sql_last_value"
#     use_column_value => true
#     tracking_column => "id"
#     # ... other configuration bits
#   }
# }
# ---------------------------------------------------------------------------------------------------
#
module LogStash module Inputs class Jdbc < LogStash::Inputs::Base
  include LogStash::PluginMixins::Jdbc::Jdbc
  config_name "jdbc"

  # If undefined, Logstash will complain, even if codec is unused.
  default :codec, "plain"

  # Statement to execute
  #
  # To use parameters, use named parameter syntax.
  # For example:
  #
  # [source, ruby]
  # -----------------------------------------------
  # "SELECT * FROM MYTABLE WHERE id = :target_id"
  # -----------------------------------------------
  #
  # here, ":target_id" is a named parameter. You can configure named parameters
  # with the `parameters` setting.
  config :statement, :validate => :string

  # Path of file containing statement to execute
  config :statement_filepath, :validate => :path

  # Hash of query parameter, for example `{ "target_id" => "321" }`
  config :parameters, :validate => :hash, :default => {}

  # Schedule of when to periodically run statement, in Cron format
  # for example: "* * * * *" (execute query every minute, on the minute)
  #
  # There is no schedule by default. If no schedule is given, then the statement is run
  # exactly once.
  config :schedule, :validate => :string

  # Path to file with last run time
  config :last_run_metadata_path, :validate => :string, :default => "#{ENV['HOME']}/.logstash_jdbc_last_run"

  # Use an incremental column value rather than a timestamp
  config :use_column_value, :validate => :boolean, :default => false

  # If tracking column value rather than timestamp, the column whose value is to be tracked
  config :tracking_column, :validate => :string

  # Type of tracking column. Currently only "numeric" and "timestamp"
  config :tracking_column_type, :validate => ['numeric', 'timestamp'], :default => 'numeric'

  # Whether the previous run state should be preserved
  config :clean_run, :validate => :boolean, :default => false

  # Whether to save state or not in last_run_metadata_path
  config :record_last_run, :validate => :boolean, :default => true

  # Whether to force the lowercasing of identifier fields
  config :lowercase_column_names, :validate => :boolean, :default => true

  # The character encoding of all columns, leave empty if the columns are already properly UTF-8
  # encoded. Specific columns charsets using :columns_charset can override this setting.
  config :charset, :validate => :string

  # The character encoding for specific columns. This option will override the `:charset` option
  # for the specified columns.
  #
  # Example:
  # [source,ruby]
  # -------------------------------------------------------
  # input {
  #   jdbc {
  #     ...
  #     columns_charset => { "column0" => "ISO-8859-1" }
  #     ...
  #   }
  # }
  # -------------------------------------------------------
  # this will only convert column0 that has ISO-8859-1 as an original encoding.
  config :columns_charset, :validate => :hash, :default => {}

  config :use_prepared_statements, :validate => :boolean, :default => false

  config :prepared_statement_name, :validate => :string, :default => ""

  config :prepared_statement_bind_values, :validate => :array, :default => []

  attr_reader :database # for test mocking/stubbing

  public

  def register
    @logger = self.logger
    require "rufus/scheduler"
    prepare_jdbc_connection

    if @use_column_value
      # Raise an error if @use_column_value is true, but no @tracking_column is set
      if @tracking_column.nil?
        raise(LogStash::ConfigurationError, "Must set :tracking_column if :use_column_value is true.")
      end
    end

    unless @statement.nil? ^ @statement_filepath.nil?
      raise(LogStash::ConfigurationError, "Must set either :statement or :statement_filepath. Only one may be set at a time.")
    end

    @statement = ::File.read(@statement_filepath) if @statement_filepath

    # must validate prepared statement mode after trying to read in from @statement_filepath
    if @use_prepared_statements
      validation_errors = validate_prepared_statement_mode
      unless validation_errors.empty?
        raise(LogStash::ConfigurationError, "Prepared Statement Mode validation errors: " + validation_errors.join(", "))
      end
    end

    set_value_tracker(LogStash::PluginMixins::Jdbc::ValueTracking.build_last_value_tracker(self))
    set_statement_logger(LogStash::PluginMixins::Jdbc::CheckedCountLogger.new(@logger))

    @enable_encoding = !@charset.nil? || !@columns_charset.empty?

    if (@jdbc_password_filepath and @jdbc_password)
      raise(LogStash::ConfigurationError, "Only one of :jdbc_password, :jdbc_password_filepath may be set at a time.")
    end

    @jdbc_password = LogStash::Util::Password.new(::File.read(@jdbc_password_filepath).strip) if @jdbc_password_filepath

    if enable_encoding?
      encodings = @columns_charset.values
      encodings << @charset if @charset

      @converters = encodings.each_with_object({}) do |encoding, converters|
        converter = LogStash::Util::Charset.new(encoding)
        converter.logger = self.logger
        converters[encoding] = converter
      end
    end
  end # def register

  # test injection points
  def set_statement_logger(instance)
    @statement_handler = LogStash::PluginMixins::Jdbc::StatementHandler.build_statement_handler(self, instance)
  end

  def set_value_tracker(instance)
    @value_tracker = instance
  end

  def run(queue)
    if @schedule
      @scheduler = Rufus::Scheduler.new(:max_work_threads => 1)
      @scheduler.cron @schedule do
        execute_query(queue)
      end

      @scheduler.join
    else
      execute_query(queue)
    end
  end # def run

  def stop
    close_jdbc_connection
    @scheduler.shutdown(:wait) if @scheduler
  end

  private

  def validate_prepared_statement_mode
    error_messages = []
    if @prepared_statement_name.empty?
      error_messages << "must provide a name for the Prepared Statement, it must be unique for the db session"
    end
    if @statement.count("?") != @prepared_statement_bind_values.size
      # mismatch in number of bind value elements to placeholder characters
      error_messages << "there is a mismatch between the number of statement `?` placeholders and :prepared_statement_bind_values array setting elements"
    end
    if @jdbc_paging_enabled
      # Pagination is not supported when using prepared statements
      error_messages << "JDBC pagination cannot be used at this time"
    end
    error_messages
  end

  def execute_query(queue)
    execute_statement do |row|
      if enable_encoding?
        ## do the necessary conversions to string elements
        row = Hash[row.map { |k, v| [k.to_s, convert(k, v)] }]
      end
      event = LogStash::Event.new(row)
      decorate(event)
      queue << event
    end
    @value_tracker.write
  end

  private

  def enable_encoding?
    @enable_encoding
  end

  # make sure the encoding is uniform over fields
  def convert(column_name, value)
    return value unless value.is_a?(String)
    column_charset = @columns_charset[column_name]
    if column_charset
      converter = @converters[column_charset]
      converter.convert(value)
    elsif @charset
      converter = @converters[@charset]
      converter.convert(value)
    else
      value
    end
  end
end end end # class LogStash::Inputs::Jdbc
