# Copyright (c) 2010-2013 Michael Dvorkin
#
# Awesome Print is freely distributable under the terms of MIT license.
# See LICENSE file or http://www.opensource.org/licenses/mit-license.php
#------------------------------------------------------------------------------
module AwesomePrint
  module Ripple

    def self.included(base)
      base.send :alias_method, :cast_without_ripple, :cast
      base.send :alias_method, :cast, :cast_with_ripple
    end

    # Add Ripple class names to the dispatcher pipeline.
    #------------------------------------------------------------------------------
    def cast_with_ripple(object, type)
      cast = cast_without_ripple(object, type)
      return cast if !defined?(::Ripple)

      if object.is_a?(::Ripple::AttributeMethods) # Module used to access attributes across documents and embedded documents
        cast = :ripple_document_instance
      elsif object.is_a?(::Ripple::Properties)    # Used to access property metadata on Ripple classes
        cast = :ripple_document_class
      end
      cast
    end

    private

    # Format Ripple instance object.
    #
    # NOTE: by default only instance attributes are shown. To format a Ripple document instance
    # as a regular object showing its instance variables and accessors use :raw => true option:
    #
    # ap document, :raw => true
    #
    #------------------------------------------------------------------------------
    def awesome_ripple_document_instance(object)
      return object.inspect if !defined?(::ActiveSupport::OrderedHash)
      return awesome_object(object) if @options[:raw]
      exclude_assoc = @options[:exclude_assoc] or @options[:exclude_associations]

      data = object.attributes.inject(::ActiveSupport::OrderedHash.new) do |hash, (name, value)|
        hash[name.to_sym] = object.send(name)
        hash
      end

      unless exclude_assoc
        data = object.class.embedded_associations.inject(data) do |hash, assoc|
          hash[assoc.name] = object.get_proxy(assoc) # Should always be array or Ripple::EmbeddedDocument for embedded associations
          hash
        end
      end

      "#{object} " << awesome_hash(data)
    end

    # Format Ripple class object.
    #------------------------------------------------------------------------------
    def awesome_ripple_document_class(object)
      return object.inspect if !defined?(::ActiveSupport::OrderedHash) || !object.respond_to?(:properties)

      data = object.properties.inject(::ActiveSupport::OrderedHash.new) do |hash, (name, defn)|
        hash[name.to_sym] = defn.type.to_s.downcase.to_sym
        hash
      end
      "class #{object} < #{object.superclass} " << awesome_hash(data)
    end
  end
end

AwesomePrint::Formatter.send(:include, AwesomePrint::Ripple)
