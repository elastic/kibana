# encoding: utf-8
require 'concurrent/atomic/atomic_boolean'
require 'rufus-scheduler'
require "logstash/util/loggable"
require "logstash/filters/fetch_strategy/file"

java_import 'java.util.concurrent.locks.ReentrantReadWriteLock'

module LogStash module Filters module Dictionary
  class DictionaryFileError < StandardError; end

  class File
    def self.create(path, refresh_interval, refresh_behaviour, exact, regex)
      if /\.y[a]?ml$/.match(path)
        instance = YamlFile.new(path, refresh_interval, exact, regex)
      elsif path.end_with?(".json")
        instance = JsonFile.new(path, refresh_interval, exact, regex)
      elsif path.end_with?(".csv")
        instance = CsvFile.new(path, refresh_interval, exact, regex)
      else
        raise "Translate: Dictionary #{path} has a non valid format"
      end
      if refresh_behaviour == 'merge'
        instance.set_update_strategy(:merge_dictionary)
      elsif refresh_behaviour == 'replace'
        instance.set_update_strategy(:replace_dictionary)
      else
        # we really should never get here
        raise(LogStash::ConfigurationError, "Unknown value for refresh_behaviour=#{refresh_behaviour.to_s}")
      end
    end

    include LogStash::Util::Loggable
    attr_reader :dictionary, :fetch_strategy

    def initialize(path, refresh_interval, exact, regex)
      @dictionary_path = path
      @refresh_interval = refresh_interval
      @short_refresh = @refresh_interval <= 300
      @stopping = Concurrent::AtomicBoolean.new # ported from jdbc_static, need a way to prevent a scheduled execution from running a load.
      rw_lock = java.util.concurrent.locks.ReentrantReadWriteLock.new
      @write_lock = rw_lock.writeLock
      @dictionary = Hash.new
      @update_method = method(:merge_dictionary)
      initialize_for_file_type
      args = [@dictionary, rw_lock]
      klass = case
              when exact && regex then FetchStrategy::File::ExactRegex
              when exact          then FetchStrategy::File::Exact
              else                     FetchStrategy::File::RegexUnion
              end
      @fetch_strategy = klass.new(*args)
      load_dictionary(raise_exception = true)
      stop_scheduler(initial = true)
      start_scheduler unless @refresh_interval <= 0 # disabled, a scheduler interval of zero makes no sense
    end

    def stop_scheduler(initial = false)
      @stopping.make_true unless initial
      @scheduler.shutdown(:wait) if @scheduler
    end

    def load_dictionary(raise_exception=false)
      begin
        @dictionary_mtime = ::File.mtime(@dictionary_path).to_f
        @update_method.call
      rescue Errno::ENOENT
        @logger.warn("dictionary file read failure, continuing with old dictionary", :path => @dictionary_path)
      rescue => e
        loading_exception(e, raise_exception)
      end
    end

    def set_update_strategy(method_sym)
      @update_method = method(method_sym)
      self
    end

    protected

    def initialize_for_file_type
      # sub class specific initializer
    end

    def read_file_into_dictionary
      # defined in csv_file, yaml_file and json_file
    end

    private

    def start_scheduler
      @scheduler = Rufus::Scheduler.new
      @scheduler.interval("#{@refresh_interval}s", :overlap => false) do
        reload_dictionary
      end
    end

    def merge_dictionary
      @write_lock.lock
      begin
        read_file_into_dictionary
        @fetch_strategy.dictionary_updated
      ensure
        @write_lock.unlock
      end
    end

    def replace_dictionary
      @write_lock.lock
      begin
        @dictionary.clear
        read_file_into_dictionary
        @fetch_strategy.dictionary_updated
      ensure
        @write_lock.unlock
      end
    end

    def reload_dictionary
      return if @stopping.true?
      if @short_refresh
        load_dictionary if needs_refresh?
      else
        load_dictionary
      end
    end

    def needs_refresh?
      @dictionary_mtime != ::File.mtime(@dictionary_path).to_f
    end

    def loading_exception(e, raise_exception)
      msg = "Translate: #{e.message} when loading dictionary file at #{@dictionary_path}"
      if raise_exception
        dfe = DictionaryFileError.new(msg)
        dfe.set_backtrace(e.backtrace)
        raise dfe
      else
        @logger.warn("#{msg}, continuing with old dictionary", :dictionary_path => @dictionary_path)
      end
    end
  end
end end end
