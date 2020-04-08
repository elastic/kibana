# Copyright (c) 2010-2013 Michael Dvorkin
#
# Awesome Print is freely distributable under the terms of MIT license.
# See LICENSE file or http://www.opensource.org/licenses/mit-license.php
#------------------------------------------------------------------------------
module AwesomePrint
  module MongoMapper

    def self.included(base)
      base.send :alias_method, :cast_without_mongo_mapper, :cast
      base.send :alias_method, :cast, :cast_with_mongo_mapper
    end

    # Add MongoMapper class names to the dispatcher pipeline.
    #------------------------------------------------------------------------------
    def cast_with_mongo_mapper(object, type)
      apply_default_mongo_mapper_options
      cast = cast_without_mongo_mapper(object, type)

      if defined?(::MongoMapper::Document)
        if object.is_a?(Class) && (object.ancestors & [ ::MongoMapper::Document, ::MongoMapper::EmbeddedDocument ]).size > 0
          cast = :mongo_mapper_class
        elsif object.is_a?(::MongoMapper::Document) || object.is_a?(::MongoMapper::EmbeddedDocument)
          cast = :mongo_mapper_instance
        elsif object.is_a?(::MongoMapper::Plugins::Associations::Base)
          cast = :mongo_mapper_association
        elsif object.is_a?(::BSON::ObjectId)
          cast = :mongo_mapper_bson_id
        end
      end

      cast
    end

    # Format MongoMapper class object.
    #------------------------------------------------------------------------------
    def awesome_mongo_mapper_class(object)
      return object.inspect if !defined?(::ActiveSupport::OrderedHash) || !object.respond_to?(:keys)

      data = object.keys.sort.inject(::ActiveSupport::OrderedHash.new) do |hash, c|
        hash[c.first] = (c.last.type || "undefined").to_s.underscore.intern
        hash
      end

      # Add in associations
      if @options[:mongo_mapper][:show_associations]
        object.associations.each do |name, assoc|
          data[name.to_s] = assoc
        end
      end

      "class #{object} < #{object.superclass} " << awesome_hash(data)
    end

    # Format MongoMapper instance object.
    #
    # NOTE: by default only instance attributes (i.e. keys) are shown. To format
    # MongoMapper instance as regular object showing its instance variables and
    # accessors use :raw => true option:
    #
    # ap record, :raw => true
    #
    #------------------------------------------------------------------------------
    def awesome_mongo_mapper_instance(object)
      return object.inspect if !defined?(::ActiveSupport::OrderedHash)
      return awesome_object(object) if @options[:raw]

      data = object.keys.keys.sort_by{|k| k}.inject(::ActiveSupport::OrderedHash.new) do |hash, name|
        hash[name] = object[name]
        hash
      end

      # Add in associations
      if @options[:mongo_mapper][:show_associations]
        object.associations.each do |name, assoc|
          if @options[:mongo_mapper][:inline_embedded] and assoc.embeddable?
            data[name.to_s] = object.send(name)
          else
            data[name.to_s] = assoc
          end
        end
      end

      label = object.to_s
      label = "#{colorize('embedded', :assoc)} #{label}" if object.is_a?(::MongoMapper::EmbeddedDocument)

      "#{label} " << awesome_hash(data)
    end

    # Format MongoMapper association object.
    #------------------------------------------------------------------------------
    def awesome_mongo_mapper_association(object)
      return object.inspect if !defined?(::ActiveSupport::OrderedHash)
      return awesome_object(object) if @options[:raw]

      association = object.class.name.split('::').last.titleize.downcase.sub(/ association$/,'')
      association = "embeds #{association}" if object.embeddable?
      class_name = object.class_name

      "#{colorize(association, :assoc)} #{colorize(class_name, :class)}"
    end

    # Format BSON::ObjectId
    #------------------------------------------------------------------------------
    def awesome_mongo_mapper_bson_id(object)
      object.inspect
    end

    private

    def apply_default_mongo_mapper_options
      @options[:color][:assoc] ||= :greenish
      @options[:mongo_mapper]  ||= {
        :show_associations => false, # Display association data for MongoMapper documents and classes.
        :inline_embedded => false    # Display embedded associations inline with MongoMapper documents.
      }
    end
  end
end

AwesomePrint::Formatter.send(:include, AwesomePrint::MongoMapper)
