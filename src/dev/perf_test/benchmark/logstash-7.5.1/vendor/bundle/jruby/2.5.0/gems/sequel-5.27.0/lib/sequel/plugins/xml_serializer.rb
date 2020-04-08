# frozen-string-literal: true

require 'nokogiri'

module Sequel
  module Plugins
    # The xml_serializer plugin handles serializing entire Sequel::Model
    # objects to XML, and deserializing XML into a single Sequel::Model
    # object or an array of Sequel::Model objects.  It requires the
    # nokogiri library.
    #
    # Basic Example:
    #
    #   album = Album[1]
    #   puts album.to_xml
    #   # Output:
    #   # <?xml version="1.0"?>
    #   # <album>
    #   #   <id>1</id>
    #   #   <name>RF</name>
    #   #   <artist_id>2</artist_id>
    #   # </album>
    #
    # You can provide options to control the XML output:
    #
    #   puts album.to_xml(only: :name)
    #   puts album.to_xml(except: [:id, :artist_id])
    #   # Output:
    #   # <?xml version="1.0"?>
    #   # <album>
    #   #   <name>RF</name>
    #   # </album>
    #
    #   album.to_xml(include: :artist)
    #   # Output:
    #   # <?xml version="1.0"?>
    #   # <album>
    #   #   <id>1</id>
    #   #   <name>RF</name>
    #   #   <artist_id>2</artist_id>
    #   #   <artist>
    #   #     <id>2</id>
    #   #     <name>YJM</name>
    #   #   </artist>
    #   # </album>
    # 
    # You can use a hash value with <tt>:include</tt> to pass options
    # to associations:
    #
    #   album.to_xml(include: {artist: {only: :name}})
    #   # Output:
    #   # <?xml version="1.0"?>
    #   # <album>
    #   #   <id>1</id>
    #   #   <name>RF</name>
    #   #   <artist_id>2</artist_id>
    #   #   <artist>
    #   #     <name>YJM</name>
    #   #   </artist>
    #   # </album>
    #
    # +to_xml+ also exists as a class and dataset method, both
    # of which return all objects in the dataset:
    #
    #   Album.to_xml
    #   Album.where(artist_id: 1).to_xml(include: :tags)
    #
    # If you have an existing array of model instances you want to convert to
    # XML, you can call the class to_xml method with the :array option:
    #
    #   Album.to_xml(array: [Album[1], Album[2]])
    #
    # In addition to creating XML, this plugin also enables Sequel::Model
    # classes to create instances directly from XML using the from_xml class
    # method:
    #
    #   xml = album.to_xml
    #   album = Album.from_xml(xml)
    #
    # The array_from_xml class method exists to parse arrays of model instances
    # from xml:
    #
    #   xml = Album.where(artist_id: 1).to_xml
    #   albums = Album.array_from_xml(xml)
    #
    # These does not necessarily round trip, since doing so would let users
    # create model objects with arbitrary values.  By default, from_xml will
    # call set using values from the tags in the xml.  If you want to specify the allowed
    # fields, you can use the :fields option, which will call set_fields with
    # the given fields:
    #
    #   Album.from_xml(album.to_xml, fields: %w'id name')
    #
    # If you want to update an existing instance, you can use the from_xml
    # instance method:
    #
    #   album.from_xml(xml)
    #
    # Both of these allow creation of cached associated objects, if you provide
    # the :associations option:
    #
    #   album.from_xml(xml, associations: :artist)
    #
    # You can even provide options when setting up the associated objects:
    #
    #   album.from_xml(xml, associations: {artist: {fields: %w'id name', associations: :tags}})
    #
    # Usage:
    #
    #   # Add XML output capability to all model subclass instances (called before loading subclasses)
    #   Sequel::Model.plugin :xml_serializer
    #
    #   # Add XML output capability to Album class instances
    #   Album.plugin :xml_serializer
    module XmlSerializer
      module ClassMethods
        # Proc that camelizes the input string, used for the :camelize option
        CAMELIZE = :camelize.to_proc

        # Proc that dasherizes the input string, used for the :dasherize option
        DASHERIZE = :dasherize.to_proc

        # Proc that returns the input string as is, used if
        # no :name_proc, :dasherize, or :camelize option is used.
        IDENTITY = proc{|s| s}

        # Proc that underscores the input string, used for the :underscore option
        UNDERSCORE = :underscore.to_proc

        # Return an array of instances of this class based on
        # the provided XML.
        def array_from_xml(xml, opts=OPTS)
          node = Nokogiri::XML(xml).children.first
          unless node 
            raise Error, "Malformed XML used"
          end
          node.children.reject{|c| c.is_a?(Nokogiri::XML::Text)}.map{|c| from_xml_node(c, opts)}
        end

        # Return an instance of this class based on the provided XML.
        def from_xml(xml, opts=OPTS)
          from_xml_node(Nokogiri::XML(xml).children.first, opts)
        end

        # Return an instance of this class based on the given
        # XML node, which should be Nokogiri::XML::Node instance.
        # This should not be used directly by user code.
        def from_xml_node(parent, opts=OPTS)
          new.from_xml_node(parent, opts)
        end

        # Return an appropriate Nokogiri::XML::Builder instance
        # used to create the XML.  This should not be used
        # directly by user code.
        def xml_builder(opts=OPTS)
          if opts[:builder]
            opts[:builder]
          else
            builder_opts = if opts[:builder_opts]
              Hash[opts[:builder_opts]]
            else
              {}
            end
            builder_opts[:encoding] = opts[:encoding] if opts.has_key?(:encoding)
            Nokogiri::XML::Builder.new(builder_opts)
          end
        end

        # Return a proc (or any other object that responds to []),
        # used for formatting XML tag names when serializing to XML.
        # This should not be used directly by user code.
        def xml_deserialize_name_proc(opts=OPTS)
          if opts[:name_proc]
            opts[:name_proc]
          elsif opts[:underscore]
            UNDERSCORE
          else
            IDENTITY
          end
        end

        # Return a proc (or any other object that responds to []),
        # used for formatting XML tag names when serializing to XML.
        # This should not be used directly by user code.
        def xml_serialize_name_proc(opts=OPTS)
          pr = if opts[:name_proc]
            opts[:name_proc]
          elsif opts[:dasherize]
            DASHERIZE
          elsif opts[:camelize]
            CAMELIZE
          else
            IDENTITY
          end
          proc{|s| "#{pr[s]}_"}
        end

        Plugins.def_dataset_methods(self, :to_xml)
      end

      module InstanceMethods
        # Update the contents of this instance based on the given XML.
        # Accepts the following options:
        #
        # :name_proc :: Proc or Hash that accepts a string and returns
        #               a string, used to convert tag names to column or
        #               association names.
        # :underscore :: Sets the :name_proc option to one that calls +underscore+
        #                on the input string.  Requires that you load the inflector
        #                extension or another library that adds String#underscore.
        def from_xml(xml, opts=OPTS)
          from_xml_node(Nokogiri::XML(xml).children.first, opts)
        end

        # Update the contents of this instance based on the given 
        # XML node, which should be a Nokogiri::XML::Node instance.
        # By default, just calls set with a hash created from the content of the node.
        # 
        # Options:
        # :associations :: Indicates that the associations cache should be updated by creating
        #                  a new associated object using data from the hash.  Should be a Symbol
        #                  for a single association, an array of symbols for multiple associations,
        #                  or a hash with symbol keys and dependent association option hash values.
        # :fields :: Changes the behavior to call set_fields using the provided fields, instead of calling set.
        def from_xml_node(parent, opts=OPTS)
          unless parent
            raise Error, "Malformed XML used"
          end
          if !parent.children.empty? && parent.children.all?{|node| node.is_a?(Nokogiri::XML::Text)}
            raise Error, "XML consisting of just text nodes used"
          end

          if assocs = opts[:associations]
            assocs = case assocs
            when Symbol
              {assocs=>OPTS}
            when Array
              assocs_tmp = {}
              assocs.each{|v| assocs_tmp[v] = OPTS}
              assocs_tmp
            when Hash
              assocs
            else
              raise Error, ":associations should be Symbol, Array, or Hash if present"
            end

            assocs_hash = {}
            assocs.each{|k,v| assocs_hash[k.to_s] = v}
            assocs_present = []
          end

          hash = {}
          populate_associations = {}
          name_proc = model.xml_deserialize_name_proc(opts)
          parent.children.each do |node|
            next if node.is_a?(Nokogiri::XML::Text)
            k = name_proc[node.name]
            if assocs_hash && assocs_hash[k]
              assocs_present << [k.to_sym, node]
            else
              hash[k] = node.key?('nil') ? nil : node.children.first.to_s
            end
          end

          if assocs_present
            assocs_present.each do |assoc, node|
              assoc_opts = assocs[assoc]

              unless r = model.association_reflection(assoc)
                raise Error, "Association #{assoc} is not defined for #{model}"
              end

              populate_associations[assoc] = if r.returns_array?
                node.children.reject{|c| c.is_a?(Nokogiri::XML::Text)}.map{|c| r.associated_class.from_xml_node(c, assoc_opts)}
              else
                r.associated_class.from_xml_node(node, assoc_opts)
              end
            end
          end

          if fields = opts[:fields]
            set_fields(hash, fields, opts)
          else
            set(hash)
          end

          populate_associations.each do |assoc, values|
            associations[assoc] = values
          end

          self
        end

        # Return a string in XML format.  If a block is given, yields the XML
        # builder object so you can add additional XML tags.
        # Accepts the following options:
        #
        # :builder :: The builder instance used to build the XML,
        #             which should be an instance of Nokogiri::XML::Node.  This
        #             is necessary if you are serializing entire object graphs,
        #             like associated objects.
        # :builder_opts :: Options to pass to the Nokogiri::XML::Builder
        #                  initializer, if the :builder option is not provided.
        # :camelize:: Sets the :name_proc option to one that calls +camelize+
        #             on the input string.  Requires that you load the inflector
        #             extension or another library that adds String#camelize.
        # :dasherize :: Sets the :name_proc option to one that calls +dasherize+
        #               on the input string.  Requires that you load the inflector
        #               extension or another library that adds String#dasherize.
        # :encoding :: The encoding to use for the XML output, passed
        #              to the Nokogiri::XML::Builder initializer.
        # :except :: Symbol or Array of Symbols of columns not
        #            to include in the XML output.
        # :include :: Symbol, Array of Symbols, or a Hash with
        #             Symbol keys and Hash values specifying
        #             associations or other non-column attributes
        #             to include in the XML output.  Using a nested
        #             hash, you can pass options to associations
        #             to affect the XML used for associated objects.
        # :name_proc :: Proc or Hash that accepts a string and returns
        #               a string, used to format tag names.
        # :only :: Symbol or Array of Symbols of columns to only
        #          include in the JSON output, ignoring all other
        #          columns.
        # :root_name :: The base name to use for the XML tag that
        #               contains the data for this instance.  This will
        #               be the name of the root node if you are only serializing
        #               a single object, but not if you are serializing
        #               an array of objects using Model.to_xml or Dataset#to_xml.
        # :types :: Set to true to include type information for
        #           all of the columns, pulled from the db_schema.
        def to_xml(opts=OPTS)
          vals = values
          types = opts[:types]
          inc = opts[:include]

          cols = if only = opts[:only]
            Array(only)
          else
            vals.keys - Array(opts[:except])
          end

          name_proc = model.xml_serialize_name_proc(opts)
          x = model.xml_builder(opts)
          x.public_send(name_proc[opts.fetch(:root_name, model.send(:underscore, model.name).gsub('/', '__')).to_s]) do |x1|
            cols.each do |c|
              attrs = {}
              if types
                attrs[:type] = db_schema.fetch(c, OPTS)[:type]
              end
              v = vals[c]
              if v.nil?
                attrs[:nil] = ''
              end
              x1.public_send(name_proc[c.to_s], v, attrs)
            end
            if inc.is_a?(Hash)
              inc.each{|k, v| to_xml_include(x1, k, v)}
            else
              Array(inc).each{|i| to_xml_include(x1, i)}
            end
            yield x1 if block_given?
          end
          x.to_xml
        end

        private

        # Handle associated objects and virtual attributes when creating
        # the xml.
        def to_xml_include(node, i, opts=OPTS)
          name_proc = model.xml_serialize_name_proc(opts)
          objs = public_send(i)
          if objs.is_a?(Array) && objs.all?{|x| x.is_a?(Sequel::Model)}
            node.public_send(name_proc[i.to_s]) do |x2|
              objs.each{|obj| obj.to_xml(opts.merge(:builder=>x2))}
            end
          elsif objs.is_a?(Sequel::Model)
            objs.to_xml(opts.merge(:builder=>node, :root_name=>i))
          else
            node.public_send(name_proc[i.to_s], objs)
          end
        end
      end

      module DatasetMethods
        # Return an XML string containing all model objects specified with
        # this dataset.  Takes all of the options available to Model#to_xml,
        # as well as the :array_root_name option for specifying the name of
        # the root node that contains the nodes for all of the instances.
        def to_xml(opts=OPTS)
          raise(Sequel::Error, "Dataset#to_xml") unless row_proc || @opts[:eager_graph]
          x = model.xml_builder(opts)
          name_proc = model.xml_serialize_name_proc(opts)
          array = if opts[:array]
            opts = opts.dup
            opts.delete(:array)
          else
            all
          end
          x.public_send(name_proc[opts.fetch(:array_root_name, model.send(:pluralize, model.send(:underscore, model.name))).to_s]) do |x1|
            array.each do |obj|
              obj.to_xml(opts.merge(:builder=>x1))
            end
          end
          x.to_xml
        end
      end
    end
  end
end
