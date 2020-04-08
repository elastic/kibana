# encoding: utf-8
require_relative "lookup"
require_relative "read_write_database"

module LogStash module Filters module Jdbc
  class LookupProcessor
    attr_reader :lookups, :local

    CONNECTION_ERROR_MSG = "Connection error when initialising lookup (local) db"
    DISCONNECTION_ERROR_MSG = "Connection error when disconnecting from lookup (local) db"

    def self.find_validation_errors(array_of_options)
      if !array_of_options.is_a?(Array)
        return "The options must be an Array"
      end
      errors = []
      instance = new(array_of_options, {})
      instance.lookups.each do |lookup|
        unless lookup.valid?
          errors << lookup.formatted_errors
        end
      end
      unless instance.valid?
        errors << instance.formatted_errors
      end
      return nil if errors.empty?
      errors.join("; ")
    end

    def initialize(lookups_array, globals)
      @lookups = lookups_array.map.with_index do |options, i|
        Lookup.new(options, globals, "lookup-#{i.next}")
      end
      @lookups_errors = validate_lookups
      if @lookups_errors.empty? && !globals.empty?
        @local = ReadWriteDatabase.create(*globals.values_at(
          "lookup_jdbc_connection_string",
          "lookup_jdbc_driver_class",
          "lookup_jdbc_driver_library").compact)
        @local.connect(CONNECTION_ERROR_MSG)
      end
    end

    def enhance(event)
      @lookups.map { |lookup| lookup.enhance(@local, event) }
    end

    def close
      @local.disconnect(DISCONNECTION_ERROR_MSG)
      @local = nil
    end

    def formatted_errors
      @lookups_errors.join(", ")
    end

    def valid?
      @lookups_errors.empty?
    end

    private

    def validate_lookups(lookups_errors = [])
      ids = Hash.new(0)
      errors = []
      @lookups.each {|lookup| ids[lookup.id] += 1}
      ids.select{|id, count| count > 1}.each do |id, count|
        errors << "'#{id}' is specified multiple times"
      end
      if !errors.empty?
        errors.unshift("Id setting must be different across all lookups")
      end
      lookups_errors.concat(errors)
      targets = Hash.new {|h,k| h[k] = []}
      errors = []
      @lookups.each do |lookup|
        # if id was used as target, skip target unique check because id uniqueness is checked already
        next if lookup.id_used_as_target?
        targets[lookup.target] << lookup.id
      end
      targets.select{|_,val| val.size > 1}.each do |target, ids|
        errors << "'#{ids.join("', '")}' have the same target field setting"
      end
      if !errors.empty?
        errors.unshift("Target setting must be different across all lookups")
      end
      lookups_errors.concat(errors)
    end
  end
end end end
