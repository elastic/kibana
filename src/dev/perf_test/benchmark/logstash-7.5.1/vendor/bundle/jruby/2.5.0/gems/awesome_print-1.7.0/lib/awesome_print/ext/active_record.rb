# Copyright (c) 2010-2013 Michael Dvorkin
#
# Awesome Print is freely distributable under the terms of MIT license.
# See LICENSE file or http://www.opensource.org/licenses/mit-license.php
#------------------------------------------------------------------------------
module AwesomePrint
  module ActiveRecord

    def self.included(base)
      base.send :alias_method, :cast_without_active_record, :cast
      base.send :alias_method, :cast, :cast_with_active_record
    end

    # Add ActiveRecord class names to the dispatcher pipeline.
    #------------------------------------------------------------------------------
    def cast_with_active_record(object, type)
      cast = cast_without_active_record(object, type)
      return cast if !defined?(::ActiveRecord)

      if object.is_a?(::ActiveRecord::Base)
        cast = :active_record_instance
      elsif object.is_a?(Class) && object.ancestors.include?(::ActiveRecord::Base)
        cast = :active_record_class
      elsif type == :activerecord_relation || object.class.ancestors.include?(::ActiveRecord::Relation)
        cast = :array
      end
      cast
    end

    private

    # Format ActiveRecord instance object.
    #
    # NOTE: by default only instance attributes (i.e. columns) are shown. To format
    # ActiveRecord instance as regular object showing its instance variables and
    # accessors use :raw => true option:
    #
    # ap record, :raw => true
    #
    #------------------------------------------------------------------------------
    def awesome_active_record_instance(object)
      return object.inspect if !defined?(::ActiveSupport::OrderedHash)
      return awesome_object(object) if @options[:raw]

      data = object.class.column_names.inject(::ActiveSupport::OrderedHash.new) do |hash, name|
        if object.has_attribute?(name) || object.new_record?
          value = object.respond_to?(name) ? object.send(name) : object.read_attribute(name)
          hash[name.to_sym] = value
        end
        hash
      end
      "#{object} " << awesome_hash(data)
    end

    # Format ActiveRecord class object.
    #------------------------------------------------------------------------------
    def awesome_active_record_class(object)
      return object.inspect if !defined?(::ActiveSupport::OrderedHash) || !object.respond_to?(:columns) || object.to_s == "ActiveRecord::Base"
      return awesome_class(object) if object.respond_to?(:abstract_class?) && object.abstract_class?

      data = object.columns.inject(::ActiveSupport::OrderedHash.new) do |hash, c|
        hash[c.name.to_sym] = c.type
        hash
      end
      "class #{object} < #{object.superclass} " << awesome_hash(data)
    end
  end
end

AwesomePrint::Formatter.send(:include, AwesomePrint::ActiveRecord)
