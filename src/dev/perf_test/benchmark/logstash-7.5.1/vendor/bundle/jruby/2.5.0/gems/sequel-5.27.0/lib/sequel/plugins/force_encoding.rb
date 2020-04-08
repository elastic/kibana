# frozen-string-literal: true

module Sequel
  module Plugins
    # The force_encoding plugin allows you force specific encodings for all
    # strings that are used by the model.  When model instances are loaded
    # from the database, all values in the hash that are strings are
    # forced to the given encoding.  Whenever you update a model column
    # attribute, the resulting value is forced to a given encoding if the
    # value is a string.  There are two ways to specify the encoding.  You
    # can either do so in the plugin call itself, or via the
    # forced_encoding class accessor.
    #
    # Usage:
    #
    #   # Force all strings to be UTF-8 encoded in a all model subclasses
    #   # (called before loading subclasses)
    #   Sequel::Model.plugin :force_encoding, 'UTF-8'
    #
    #   # Force the encoding for the Album model to UTF-8
    #   Album.plugin :force_encoding
    #   Album.forced_encoding = 'UTF-8'
    module ForceEncoding
      # Set the forced_encoding based on the value given in the plugin call.
      # Note that if a the plugin has been previously loaded, any previous
      # forced encoding is overruled, even if no encoding is given when calling
      # the plugin.
      def self.configure(model, encoding=nil)
        model.forced_encoding = encoding
      end
      
      module ClassMethods
        # The string encoding to force on a column string values
        attr_accessor :forced_encoding
        
        Plugins.inherited_instance_variables(self, :@forced_encoding=>nil)

        def call(values)
          o = super
          o.send(:force_hash_encoding, o.values)
          o
        end
      end
    
      module InstanceMethods
        private
        
        # Force the encoding of all string values when setting the instance's values.
        def _refresh_set_values(values)
          super(force_hash_encoding(values))
        end
        
        # Force the encoding of all string values when setting the instance's values.
        def _save_set_values(values)
          super(force_hash_encoding(values))
        end
        
        # Force the encoding for all string values in the given row hash.
        def force_hash_encoding(row)
          if fe = model.forced_encoding
            row.each_value{|v| v.force_encoding(fe) if v.is_a?(String) && !v.is_a?(Sequel::SQL::Blob)}
          end
          row
        end
        
        # Force the encoding of all returned strings to the model's forced_encoding.
        def typecast_value(column, value)
          s = super
          if s.is_a?(String) && !s.is_a?(Sequel::SQL::Blob) && (fe = model.forced_encoding)
            s = s.dup if s.frozen?
            s.force_encoding(fe)
          end
          s
        end
      end
    end
  end
end
