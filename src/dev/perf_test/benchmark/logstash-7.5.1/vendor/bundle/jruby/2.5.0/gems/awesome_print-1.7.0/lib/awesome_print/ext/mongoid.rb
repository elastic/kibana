# Copyright (c) 2010-2013 Michael Dvorkin
#
# Awesome Print is freely distributable under the terms of MIT license.
# See LICENSE file or http://www.opensource.org/licenses/mit-license.php
#------------------------------------------------------------------------------
module AwesomePrint
  module Mongoid

    def self.included(base)
      base.send :alias_method, :cast_without_mongoid, :cast
      base.send :alias_method, :cast, :cast_with_mongoid
    end

    # Add Mongoid class names to the dispatcher pipeline.
    #------------------------------------------------------------------------------
    def cast_with_mongoid(object, type)
      cast = cast_without_mongoid(object, type)
      if defined?(::Mongoid::Document)
        if object.is_a?(Class) && object.ancestors.include?(::Mongoid::Document)
          cast = :mongoid_class
        elsif object.class.ancestors.include?(::Mongoid::Document)
          cast = :mongoid_document
        elsif (defined?(::BSON) && object.is_a?(::BSON::ObjectId)) || (defined?(::Moped::BSON) && object.is_a?(::Moped::BSON::ObjectId))
          cast = :mongoid_bson_id
        end
      end
      cast
    end

    # Format Mongoid class object.
    #------------------------------------------------------------------------------
    def awesome_mongoid_class(object)
      return object.inspect if !defined?(::ActiveSupport::OrderedHash) || !object.respond_to?(:fields)

      data = object.fields.sort_by { |key| key }.inject(::ActiveSupport::OrderedHash.new) do |hash, c|
        hash[c[1].name.to_sym] = (c[1].type || "undefined").to_s.underscore.intern
        hash
      end
      "class #{object} < #{object.superclass} " << awesome_hash(data)
    end

    # Format Mongoid Document object.
    #------------------------------------------------------------------------------
    def awesome_mongoid_document(object)
      return object.inspect if !defined?(::ActiveSupport::OrderedHash)

      data = (object.attributes || {}).sort_by { |key| key }.inject(::ActiveSupport::OrderedHash.new) do |hash, c|
        hash[c[0].to_sym] = c[1]
        hash
      end
      if !object.errors.empty?
        data = {:errors => object.errors, :attributes => data}
      end
      "#{object} #{awesome_hash(data)}"
    end

    # Format BSON::ObjectId
    #------------------------------------------------------------------------------
    def awesome_mongoid_bson_id(object)
      object.inspect
    end
  end
end

AwesomePrint::Formatter.send(:include, AwesomePrint::Mongoid)
