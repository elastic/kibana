# frozen-string-literal: true

module Sequel
  module Plugins
    # StringStripper is a plugin that strips all input strings
    # when assigning to the model's values. Example:
    #
    #   album = Album.new(name: ' A ')
    #   album.name # => 'A'
    #
    # SQL::Blob instances and all non-strings are not modified by
    # this plugin.  Additionally, strings passed to a blob column
    # setter are also not modified.  You can explicitly set
    # other columns to skip the stripping:
    #
    #   Album.skip_string_stripping :foo
    #   Album.new(foo: ' A ').foo # => ' A '
    # 
    # Usage:
    #
    #   # Make all model subclass instances strip strings (called before loading subclasses)
    #   Sequel::Model.plugin :string_stripper
    #
    #   # Make the Album class strip strings
    #   Album.plugin :string_stripper
    module StringStripper
      def self.apply(model)
        model.plugin(:input_transformer, :string_stripper){|v| (v.is_a?(String) && !v.is_a?(SQL::Blob)) ? v.strip : v}
      end
      def self.configure(model)
        model.instance_exec{set_skipped_string_stripping_columns if @dataset}
      end

      module ClassMethods
        Plugins.after_set_dataset(self, :set_skipped_string_stripping_columns)

        # Skip stripping for the given columns.
        def skip_string_stripping(*columns)
          skip_input_transformer(:string_stripper, *columns)
        end

        # Return true if the column should not have values stripped.
        def skip_string_stripping?(column)
          skip_input_transformer?(:string_stripper, column)
        end

        private

        # Automatically skip stripping of blob columns
        def set_skipped_string_stripping_columns
          if @db_schema
            blob_columns = @db_schema.map{|k,v| k if v[:type] == :blob}.compact
            skip_string_stripping(*blob_columns)
          end
        end
      end
    end
  end
end
