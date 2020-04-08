# frozen-string-literal: true
#
# The schema_dumper extension supports dumping tables and indexes
# in a Sequel::Migration format, so they can be restored on another
# database (which can be the same type or a different type than
# the current database).  The main interface is through
# Sequel::Database#dump_schema_migration.
#
# To load the extension:
#
#   DB.extension :schema_dumper
#
# Related module: Sequel::SchemaDumper

Sequel.extension :eval_inspect

module Sequel
  module SchemaDumper
    # Convert the column schema information to a hash of column options, one of which must
    # be :type.  The other options added should modify that type (e.g. :size).  If a
    # database type is not recognized, return it as a String type.
    def column_schema_to_ruby_type(schema)
      type = schema[:db_type].downcase
      if database_type == :oracle
        type = type.sub(/ not null\z/, '')
      end
      case type
      when /\A(medium|small)?int(?:eger)?(?:\((\d+)\))?( unsigned)?\z/
        if !$1 && $2 && $2.to_i >= 10 && $3
          # Unsigned integer type with 10 digits can potentially contain values which
          # don't fit signed integer type, so use bigint type in target database.
          {:type=>:Bignum}
        else
          {:type=>Integer}
        end
      when /\Atinyint(?:\((\d+)\))?(?: unsigned)?\z/
        {:type =>schema[:type] == :boolean ? TrueClass : Integer}
      when /\Abigint(?:\((?:\d+)\))?(?: unsigned)?\z/
        {:type=>:Bignum}
      when /\A(?:real|float(?: unsigned)?|double(?: precision)?|double\(\d+,\d+\)(?: unsigned)?)\z/
        {:type=>Float}
      when 'boolean', 'bit', 'bool'
        {:type=>TrueClass}
      when /\A(?:(?:tiny|medium|long|n)?text|clob)\z/
        {:type=>String, :text=>true}
      when 'date'
        {:type=>Date}
      when /\A(?:small)?datetime\z/
        {:type=>DateTime}
      when /\Atimestamp(?:\((\d+)\))?(?: with(?:out)? time zone)?\z/
        {:type=>DateTime, :size=>($1.to_i if $1)}
      when /\Atime(?: with(?:out)? time zone)?\z/
        {:type=>Time, :only_time=>true}
      when /\An?char(?:acter)?(?:\((\d+)\))?\z/
        {:type=>String, :size=>($1.to_i if $1), :fixed=>true}
      when /\A(?:n?varchar2?|character varying|bpchar|string)(?:\((\d+)\))?\z/
        {:type=>String, :size=>($1.to_i if $1)}
      when /\A(?:small)?money\z/
        {:type=>BigDecimal, :size=>[19,2]}
      when /\A(?:decimal|numeric|number)(?:\((\d+)(?:,\s*(\d+))?\))?\z/
        s = [($1.to_i if $1), ($2.to_i if $2)].compact
        {:type=>BigDecimal, :size=>(s.empty? ? nil : s)}
      when /\A(?:bytea|(?:tiny|medium|long)?blob|(?:var)?binary)(?:\((\d+)\))?\z/
        {:type=>File, :size=>($1.to_i if $1)}
      when /\A(?:year|(?:int )?identity)\z/
        {:type=>Integer}
      else
        {:type=>String}
      end
    end

    # Dump foreign key constraints for all tables as a migration. This complements
    # the foreign_keys: false option to dump_schema_migration. This only dumps
    # the constraints (not the columns) using alter_table/add_foreign_key with an
    # array of columns.
    #
    # Note that the migration this produces does not have a down
    # block, so you cannot reverse it.
    def dump_foreign_key_migration(options=OPTS)
      ts = tables(options)
      <<END_MIG
Sequel.migration do
  change do
#{ts.sort.map{|t| dump_table_foreign_keys(t)}.reject{|x| x == ''}.join("\n\n").gsub(/^/, '    ')}
  end
end
END_MIG
    end

    # Dump indexes for all tables as a migration.  This complements
    # the indexes: false option to dump_schema_migration. Options:
    # :same_db :: Create a dump for the same database type, so
    #             don't ignore errors if the index statements fail.
    # :index_names :: If set to false, don't record names of indexes. If
    #                 set to :namespace, prepend the table name to the index name if the
    #                 database does not use a global index namespace.
    def dump_indexes_migration(options=OPTS)
      ts = tables(options)
      <<END_MIG
Sequel.migration do
  change do
#{ts.sort.map{|t| dump_table_indexes(t, :add_index, options)}.reject{|x| x == ''}.join("\n\n").gsub(/^/, '    ')}
  end
end
END_MIG
    end

    # Return a string that contains a Sequel migration that when
    # run would recreate the database structure. Options:
    # :same_db :: Don't attempt to translate database types to ruby types.
    #             If this isn't set to true, all database types will be translated to
    #             ruby types, but there is no guarantee that the migration generated
    #             will yield the same type.  Without this set, types that aren't
    #             recognized will be translated to a string-like type.
    # :foreign_keys :: If set to false, don't dump foreign_keys (they can be
    #                  added later via #dump_foreign_key_migration)
    # :indexes :: If set to false, don't dump indexes (they can be added
    #             later via #dump_index_migration).
    # :index_names :: If set to false, don't record names of indexes. If
    #                 set to :namespace, prepend the table name to the index name.
    def dump_schema_migration(options=OPTS)
      options = options.dup
      if options[:indexes] == false && !options.has_key?(:foreign_keys)
        # Unless foreign_keys option is specifically set, disable if indexes
        # are disabled, as foreign keys that point to non-primary keys rely
        # on unique indexes being created first
        options[:foreign_keys] = false
      end

      ts = sort_dumped_tables(tables(options), options)
      skipped_fks = if sfk = options[:skipped_foreign_keys]
        # Handle skipped foreign keys by adding them at the end via
        # alter_table/add_foreign_key.  Note that skipped foreign keys
        # probably result in a broken down migration.
        sfka = sfk.sort.map{|table, fks| dump_add_fk_constraints(table, fks.values)}
        sfka.join("\n\n").gsub(/^/, '    ') unless sfka.empty?
      end

      <<END_MIG
Sequel.migration do
  change do
#{ts.map{|t| dump_table_schema(t, options)}.join("\n\n").gsub(/^/, '    ')}#{"\n    \n" if skipped_fks}#{skipped_fks}
  end
end
END_MIG
    end

    # Return a string with a create table block that will recreate the given
    # table's schema.  Takes the same options as dump_schema_migration.
    def dump_table_schema(table, options=OPTS)
      gen = dump_table_generator(table, options)
      commands = [gen.dump_columns, gen.dump_constraints, gen.dump_indexes].reject{|x| x == ''}.join("\n\n")
      "create_table(#{table.inspect}#{', :ignore_index_errors=>true' if !options[:same_db] && options[:indexes] != false && !gen.indexes.empty?}) do\n#{commands.gsub(/^/, '  ')}\nend"
    end

    private
        
    # If a database default exists and can't be converted, and we are dumping with :same_db,
    # return a string with the inspect method modified a literal string is created if the code is evaled.  
    def column_schema_to_ruby_default_fallback(default, options)
      if default.is_a?(String) && options[:same_db] && use_column_schema_to_ruby_default_fallback?
        default = default.dup
        def default.inspect
          "Sequel::LiteralString.new(#{super})"
        end
        default
      end
    end

    # Recreate the column in the passed Schema::CreateTableGenerator from the given name and parsed database schema.
    def recreate_column(name, schema, gen, options)
      if options[:single_pk] && schema_autoincrementing_primary_key?(schema)
        type_hash = options[:same_db] ? {:type=>schema[:db_type]} : column_schema_to_ruby_type(schema)
        [:table, :key, :on_delete, :on_update, :deferrable].each{|f| type_hash[f] = schema[f] if schema[f]}
        if type_hash == {:type=>Integer} || type_hash == {:type=>"integer"}
          type_hash.delete(:type)
        elsif options[:same_db] && type_hash == {:type=>type_literal_generic_bignum_symbol(type_hash).to_s}
          type_hash[:type] = :Bignum
        end

        unless gen.columns.empty?
          type_hash[:keep_order] = true
        end

        if type_hash.empty?
          gen.primary_key(name)
        else
          gen.primary_key(name, type_hash)
        end
      else
        col_opts = if options[:same_db]
          h = {:type=>schema[:db_type]}
          if database_type == :mysql && h[:type] =~ /\Atimestamp/
            h[:null] = true
          end
          h
        else
          column_schema_to_ruby_type(schema)
        end
        type = col_opts.delete(:type)
        col_opts.delete(:size) if col_opts[:size].nil?
        col_opts[:default] = if schema[:ruby_default].nil?
          column_schema_to_ruby_default_fallback(schema[:default], options)
        else
          schema[:ruby_default]
        end
        col_opts.delete(:default) if col_opts[:default].nil?
        col_opts[:null] = false if schema[:allow_null] == false
        if table = schema[:table]
          [:key, :on_delete, :on_update, :deferrable].each{|f| col_opts[f] = schema[f] if schema[f]}
          col_opts[:type] = type unless type == Integer || type == 'integer'
          gen.foreign_key(name, table, col_opts)
        else
          gen.column(name, type, col_opts)
          if [Integer, :Bignum, Float].include?(type) && schema[:db_type] =~ / unsigned\z/io
            gen.check(Sequel::SQL::Identifier.new(name) >= 0)
          end
        end
      end
    end

    # For the table and foreign key metadata array, return an alter_table
    # string that would add the foreign keys if run in a migration.
    def dump_add_fk_constraints(table, fks)
      sfks = String.new
      sfks << "alter_table(#{table.inspect}) do\n"
      sfks << create_table_generator do
        fks.sort_by{|fk| fk[:columns]}.each do |fk|
          foreign_key fk[:columns], fk
        end
      end.dump_constraints.gsub(/^foreign_key /, '  add_foreign_key ')
      sfks << "\nend"
    end

    # For the table given, get the list of foreign keys and return an alter_table
    # string that would add the foreign keys if run in a migration.
    def dump_table_foreign_keys(table, options=OPTS)
      if supports_foreign_key_parsing?
        fks = foreign_key_list(table, options).sort_by{|fk| fk[:columns]}
      end

      if fks.nil? || fks.empty?
        ''
      else
        dump_add_fk_constraints(table, fks)
      end
    end

    # Return a Schema::CreateTableGenerator object that will recreate the
    # table's schema.  Takes the same options as dump_schema_migration.
    def dump_table_generator(table, options=OPTS)
      s = schema(table, options).dup
      pks = s.find_all{|x| x.last[:primary_key] == true}.map(&:first)
      options = options.merge(:single_pk=>true) if pks.length == 1
      m = method(:recreate_column)
      im = method(:index_to_generator_opts)

      if options[:indexes] != false && supports_index_parsing?
        indexes = indexes(table).sort
      end

      if options[:foreign_keys] != false && supports_foreign_key_parsing?
        fk_list = foreign_key_list(table)
        
        if (sfk = options[:skipped_foreign_keys]) && (sfkt = sfk[table])
          fk_list.delete_if{|fk| sfkt.has_key?(fk[:columns])}
        end

        composite_fks, single_fks = fk_list.partition{|h| h[:columns].length > 1}
        fk_hash = {}

        single_fks.each do |fk|
          column = fk.delete(:columns).first
          fk.delete(:name)
          fk_hash[column] = fk
        end

        s = s.map do |name, info|
          if fk_info = fk_hash[name]
            [name, fk_info.merge(info)]
          else
            [name, info]
          end
        end
      end

      create_table_generator do
        s.each{|name, info| m.call(name, info, self, options)}
        primary_key(pks) if !@primary_key && pks.length > 0
        indexes.each{|iname, iopts| send(:index, iopts[:columns], im.call(table, iname, iopts, options))} if indexes
        composite_fks.each{|fk| send(:foreign_key, fk[:columns], fk)} if composite_fks
      end
    end

    # Return a string that containing add_index/drop_index method calls for
    # creating the index migration.
    def dump_table_indexes(table, meth, options=OPTS)
      if supports_index_parsing?
        indexes = indexes(table).sort
      else
        return ''
      end

      im = method(:index_to_generator_opts)
      gen = create_table_generator do
        indexes.each{|iname, iopts| send(:index, iopts[:columns], im.call(table, iname, iopts, options))}
      end
      gen.dump_indexes(meth=>table, :ignore_errors=>!options[:same_db])
    end

    # Convert the parsed index information into options to the CreateTableGenerator's index method. 
    def index_to_generator_opts(table, name, index_opts, options=OPTS)
      h = {}
      if options[:index_names] != false && default_index_name(table, index_opts[:columns]) != name.to_s
        if options[:index_names] == :namespace && !global_index_namespace?
          h[:name] = "#{table}_#{name}".to_sym
        else
          h[:name] = name
        end
      end
      h[:unique] = true if index_opts[:unique]
      h[:deferrable] = true if index_opts[:deferrable]
      h
    end

    # Sort the tables so that referenced tables are created before tables that
    # reference them, and then by name.  If foreign keys are disabled, just sort by name.
    def sort_dumped_tables(tables, options=OPTS)
      if options[:foreign_keys] != false && supports_foreign_key_parsing?
        table_fks = {}
        tables.each{|t| table_fks[t] = foreign_key_list(t)}
        # Remove self referential foreign keys, not important when sorting.
        table_fks.each{|t, fks| fks.delete_if{|fk| fk[:table] == t}}
        tables, skipped_foreign_keys = sort_dumped_tables_topologically(table_fks, [])
        options[:skipped_foreign_keys] = skipped_foreign_keys
        tables
      else
        tables.sort
      end
    end

    # Do a topological sort of tables, so that referenced tables
    # come before referencing tables.  Returns an array of sorted
    # tables and a hash of skipped foreign keys.  The hash will be
    # empty unless there are circular dependencies.
    def sort_dumped_tables_topologically(table_fks, sorted_tables)
      skipped_foreign_keys = {}

      until table_fks.empty? 
        this_loop = []

        table_fks.each do |table, fks|
          fks.delete_if{|fk| !table_fks.has_key?(fk[:table])}
          this_loop << table if fks.empty?
        end

        if this_loop.empty?
          # No tables were changed this round, there must be a circular dependency.
          # Break circular dependency by picking the table with the least number of
          # outstanding foreign keys and skipping those foreign keys.
          # The skipped foreign keys will be added at the end of the
          # migration.
          skip_table, skip_fks = table_fks.sort_by{|table, fks| [fks.length, table]}.first
          skip_fks_hash = skipped_foreign_keys[skip_table] = {}
          skip_fks.each{|fk| skip_fks_hash[fk[:columns]] = fk}
          this_loop << skip_table
        end

        # Add sorted tables from this loop to the final list
        sorted_tables.concat(this_loop.sort)

        # Remove tables that were handled this loop
        this_loop.each{|t| table_fks.delete(t)}
      end

      [sorted_tables, skipped_foreign_keys]
    end
    
    # Don't use a literal string fallback on MySQL, since the defaults it uses aren't
    # valid literal SQL values.
    def use_column_schema_to_ruby_default_fallback?
      database_type != :mysql
    end
  end

  module Schema
    class CreateTableGenerator
      # Dump this generator's columns to a string that could be evaled inside
      # another instance to represent the same columns
      def dump_columns
        strings = []
        cols = columns.dup
        cols.each do |x|
          x.delete(:on_delete) if x[:on_delete] == :no_action
          x.delete(:on_update) if x[:on_update] == :no_action
        end
        if (pkn = primary_key_name) && !@primary_key[:keep_order]
          cols.delete_if{|x| x[:name] == pkn}
          pk = @primary_key.dup
          pkname = pk.delete(:name)
          @db.serial_primary_key_options.each{|k,v| pk.delete(k) if v == pk[k]}
          strings << "primary_key #{pkname.inspect}#{opts_inspect(pk)}"
        end
        cols.each do |c|
          c = c.dup
          name = c.delete(:name)
          strings << if table = c.delete(:table)
            c.delete(:type) if c[:type] == Integer || c[:type] == 'integer'
            "foreign_key #{name.inspect}, #{table.inspect}#{opts_inspect(c)}"
          elsif pkn == name
            @db.serial_primary_key_options.each{|k,v| c.delete(k) if v == c[k]}
            "primary_key #{name.inspect}#{opts_inspect(c)}"
          else
            type = c.delete(:type)
            opts = opts_inspect(c)
            case type
            when Class
              "#{type.name} #{name.inspect}#{opts}"
            when :Bignum
              "Bignum #{name.inspect}#{opts}"
            else
              "column #{name.inspect}, #{type.inspect}#{opts}"
            end
          end
        end
        strings.join("\n")
      end

      # Dump this generator's constraints to a string that could be evaled inside
      # another instance to represent the same constraints
      def dump_constraints
        cs = constraints.map do |c|
          c = c.dup
          type = c.delete(:type)
          case type
          when :check
            raise(Error, "can't dump check/constraint specified with Proc") if c[:check].is_a?(Proc)
            name = c.delete(:name)
            if !name and c[:check].length == 1 and c[:check].first.is_a?(Hash)
              "check #{c[:check].first.inspect[1...-1]}"
            else
              "#{name ? "constraint #{name.inspect}," : 'check'} #{c[:check].map(&:inspect).join(', ')}"
            end
          when :foreign_key
            c.delete(:on_delete) if c[:on_delete] == :no_action
            c.delete(:on_update) if c[:on_update] == :no_action
            c.delete(:deferrable) unless c[:deferrable]
            cols = c.delete(:columns)
            table = c.delete(:table)
            "#{type} #{cols.inspect}, #{table.inspect}#{opts_inspect(c)}"
          else
            cols = c.delete(:columns)
            "#{type} #{cols.inspect}#{opts_inspect(c)}"
          end
        end
        cs.join("\n")
      end

      # Dump this generator's indexes to a string that could be evaled inside
      # another instance to represent the same indexes. Options:
      # :add_index :: Use add_index instead of index, so the methods
      #               can be called outside of a generator but inside a migration.
      #               The value of this option should be the table name to use.
      # :drop_index :: Same as add_index, but create drop_index statements.
      # :ignore_errors :: Add the ignore_errors option to the outputted indexes
      def dump_indexes(options=OPTS)
        is = indexes.map do |c|
          c = c.dup
          cols = c.delete(:columns)
          if table = options[:add_index] || options[:drop_index]
            "#{options[:drop_index] ? 'drop' : 'add'}_index #{table.inspect}, #{cols.inspect}#{', :ignore_errors=>true' if options[:ignore_errors]}#{opts_inspect(c)}"
          else
            "index #{cols.inspect}#{opts_inspect(c)}"
          end
        end
        is = is.reverse if options[:drop_index]
        is.join("\n")
      end

      private

      # Return a string that converts the given options into one
      # suitable for literal ruby code, handling default values
      # that don't default to a literal interpretation.
      def opts_inspect(opts)
        if opts[:default]
          opts = opts.dup
          de = Sequel.eval_inspect(opts.delete(:default)) 
          ", :default=>#{de}#{", #{opts.inspect[1...-1]}" if opts.length > 0}"
        else
          ", #{opts.inspect[1...-1]}" if opts.length > 0
        end
      end
    end
  end

  Database.register_extension(:schema_dumper, SchemaDumper)
end
