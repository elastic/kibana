# frozen-string-literal: true
#
# The pg_static_cache_updater extension is designed to
# automatically update the caches in the models using the
# static_cache plugin when changes to the underlying tables
# are detected.
#
# Before using the extension in production, you have to add
# triggers to the tables for the classes where you want the
# caches updated automatically.  You would generally do this
# during a migration:
#
#   Sequel.migration do
#     up do
#       extension :pg_static_cache_updater
#       create_static_cache_update_function
#       create_static_cache_update_trigger(:table_1)
#       create_static_cache_update_trigger(:table_2)
#     end
#     down do
#       extension :pg_static_cache_updater
#       drop_trigger(:table_2, default_static_cache_update_name)
#       drop_trigger(:table_1, default_static_cache_update_name)
#       drop_function(default_static_cache_update_name)
#     end
#   end
#
# After the triggers have been added, in your application process,
# after setting up your models, you need to listen for changes to
# the underlying tables:
#
#   class Model1 < Sequel::Model(:table_1)
#     plugin :static_cache
#   end
#   class Model2 < Sequel::Model(:table_2)
#     plugin :static_cache
#   end
#
#   DB.extension :pg_static_cache_updater
#   DB.listen_for_static_cache_updates([Model1, Model2])
#
# When an INSERT/UPDATE/DELETE happens on the underlying table,
# the trigger will send a notification with the table's OID.
# The application(s) listening on that channel will receive
# the notification, check the oid to see if it matches one
# for the model tables it is interested in, and tell that model
# to reload the cache if there is a match.
#
# Note that listen_for_static_cache_updates spawns a new thread
# which will reserve its own database connection.  This thread
# runs until the application process is shutdown.
#
# Also note that PostgreSQL does not send notifications to
# channels until after the transaction including the changes
# is committed.  Also, because a separate thread is used to
# listen for notifications, there may be a slight delay between
# when the transaction is committed and when the cache is
# reloaded.
#
# Requirements:
# * PostgreSQL 9.0+
# * Listening Database object must be using the postgres adapter
#   with the pg driver (the model classes do not have to
#   use the same Database).
# * Must be using a thread-safe connection pool (the default).
#
# Related module: Sequel::Postgres::StaticCacheUpdater

#
module Sequel
  module Postgres
    module StaticCacheUpdater
      # Add the static cache update function to the PostgreSQL database.
      # This must be added before any triggers using this function are
      # added.
      #
      # Options:
      # :channel_name :: Override the channel name to use.
      # :function_name :: Override the function name to use.
      def create_static_cache_update_function(opts=OPTS)
        create_function(opts[:function_name]||default_static_cache_update_name, <<SQL, :returns=>:trigger, :language=>:plpgsql)
BEGIN
  PERFORM pg_notify(#{literal((opts[:channel_name]||default_static_cache_update_name).to_s)}, TG_RELID::text);
  RETURN NULL;
END
SQL
      end

      # Add a trigger to the given table that calls the function
      # which will notify about table changes.
      #
      # Options:
      # :function_name :: Override the function name to use.
      # :trigger_name :: Override the trigger name to use.
      def create_static_cache_update_trigger(table, opts=OPTS)
        create_trigger(table, opts[:trigger_name]||default_static_cache_update_name, opts[:function_name]||default_static_cache_update_name, :after=>true)
      end

      # The default name for the function, trigger, and notification channel
      # for this extension.
      def default_static_cache_update_name
        :sequel_static_cache_update
      end

      # Listen on the notification channel for changes to any of tables for
      # the models given in a new thread. If notified about a change to one of the tables,
      # reload the cache for the related model.  Options given are also
      # passed to Database#listen.
      #
      # Note that this implementation does not currently support multiple
      # models that use the same underlying table.
      #
      # Options:
      # :channel_name :: Override the channel name to use.
      # :before_thread_exit :: An object that responds to +call+ that is called before the 
      #                        the created thread exits.
      def listen_for_static_cache_updates(models, opts=OPTS)
        raise Error, "this database object does not respond to listen, use the postgres adapter with the pg driver" unless respond_to?(:listen)
        models = [models] unless models.is_a?(Array)
        raise Error, "array of models to listen for changes cannot be empty" if models.empty?

        oid_map = {}
        models.each do |model|
          raise Error, "#{model.inspect} does not use the static_cache plugin" unless model.respond_to?(:load_cache)
          oid_map[get(regclass_oid(model.dataset.first_source_table))] = model
        end

        Thread.new do
          begin
            listen(opts[:channel_name]||default_static_cache_update_name, {:loop=>true}.merge!(opts)) do |_, _, oid|
              if model = oid_map[oid.to_i]
                model.load_cache
              end
            end
          ensure
            opts[:before_thread_exit].call if opts[:before_thread_exit]
          end
        end
      end
    end
  end

  Database.register_extension(:pg_static_cache_updater, Postgres::StaticCacheUpdater)
end
