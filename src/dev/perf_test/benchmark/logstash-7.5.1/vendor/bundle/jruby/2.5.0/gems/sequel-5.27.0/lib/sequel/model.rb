# frozen-string-literal: true

require_relative 'core'

module Sequel
  # <tt>Sequel::Model</tt> is an object relational mapper built on top of Sequel core.  Each
  # model class is backed by a dataset instance, and many dataset methods can be
  # called directly on the class.  Model datasets return rows as model instances,
  # which are wrappers around the underlying hash that allow easily updating or
  # deleting the individual row.
  #
  # <tt>Sequel::Model</tt> is built completely out of plugins.  Plugins can override any class,
  # instance, or dataset method defined by a previous plugin and call super to get the default
  # behavior.  By default, <tt>Sequel::Model</tt> loads two plugins, <tt>Sequel::Model</tt>
  # (which is itself a plugin) for the base support, and <tt>Sequel::Model::Associations</tt>
  # for the associations support.
  #
  # You can set the +SEQUEL_NO_ASSOCIATIONS+ constant or environment variable to
  # make Sequel not load the associations plugin by default.
  class Model
    OPTS = Sequel::OPTS

    # Empty instance methods to create that the user can override.
    # Just like any other method defined by Sequel, if you override one of these, you should
    # call +super+ to get the default behavior (while empty by default, they are often overridden
    # by plugins).  See the {"Model Hooks" guide}[rdoc-ref:doc/model_hooks.rdoc] for
    # more detail on hooks.
    HOOKS = [
      :after_create,
      :after_destroy,
      :after_save,
      :after_update,
      :after_validation,
      :before_create,
      :before_destroy,
      :before_save,
      :before_update,
      :before_validation
    ].freeze

    @cache_anonymous_models = true
    @db = nil
    @db_schema = nil
    @dataset = nil
    @dataset_method_modules = []
    @default_set_fields_options = {}
    @overridable_methods_module = nil
    @fast_pk_lookup_sql = nil
    @fast_instance_delete_sql = nil
    @plugins = []
    @primary_key = :id
    @raise_on_save_failure = true
    @raise_on_typecast_failure = false
    @require_modification = nil
    @require_valid_table = true
    @restrict_primary_key = true
    @setter_methods = nil
    @simple_pk = nil
    @simple_table = nil
    @strict_param_setting = true
    @typecast_empty_string_to_nil = true
    @typecast_on_assignment = true
    @use_transactions = true

    require_relative "model/default_inflections"
    require_relative "model/inflections"
    require_relative "model/plugins"
    require_relative "model/dataset_module"
    require_relative "model/base"
    require_relative "model/exceptions"
    require_relative "model/errors"
    if !defined?(::SEQUEL_NO_ASSOCIATIONS) && !ENV.has_key?('SEQUEL_NO_ASSOCIATIONS')
      require_relative 'model/associations'
      plugin Model::Associations
    end

    def_Model(::Sequel)

    # The setter methods (methods ending with =) that are never allowed
    # to be called automatically via +set+/+update+/+new+/etc..
    RESTRICTED_SETTER_METHODS = instance_methods.map(&:to_s).select{|l| l.end_with?('=')}.freeze
  end
end
