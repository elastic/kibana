# encoding: utf-8
require 'logstash-core'
require 'logstash/compiler'

module LogStash;
  module Config;
  class LIRSerializer
    attr_reader :lir_pipeline
    
    def self.serialize(lir_pipeline)
      self.new(lir_pipeline).serialize
    end
    
    def initialize(lir_pipeline)
      @lir_pipeline = lir_pipeline
    end
    
    def serialize
      {
        "hash" => lir_pipeline.unique_hash,
        "type" => "lir",
        "version" => "0.0.0",
        "graph" => {
          "vertices" => vertices,
          "edges" => edges
        }
      }
    end
    
    def vertices
      graph.getVertices.map {|v| vertex(v) }
    end
    
    def edges
      graph.getEdges.map {|e| edge(e) }
    end
    
    def graph
      lir_pipeline.graph
    end
    
    def vertex(v)
      hashified_vertex = case vertex_type(v) 
                         when :plugin 
                           plugin_vertex(v)
                         when :if 
                           if_vertex(v)
                         when :queue
                           queue_vertex(v)
                         end

      decorate_vertex(v, hashified_vertex)
    end
    
    def vertex_type(v)
      if v.java_kind_of?(org.logstash.config.ir.graph.PluginVertex)
        :plugin
      elsif v.java_kind_of?(org.logstash.config.ir.graph.IfVertex)
        :if
      elsif v.java_kind_of?(org.logstash.config.ir.graph.QueueVertex)
        :queue
      else
        raise "Unexpected vertex type! #{v}"
      end
    end
    
    def decorate_vertex(v, v_json)
      v_json["meta"] = format_swm(v.source_with_metadata)
      v_json["id"] = v.id
      v_json["explicit_id"] = !!v.explicit_id
      v_json["type"] = vertex_type(v).to_s
      v_json
    end
    
    def plugin_vertex(v)
      pd = v.plugin_definition
      {
        "config_name" => pd.name,
        "plugin_type" => pd.getType.to_s.downcase
      }
    end
    
    def if_vertex(v)
      {
        "condition" => v.humanReadableExpression
      }
    end
    
    def queue_vertex(v)
      {}
    end
    
    def edge(e)
      e_json = {
        "from" => e.from.id,
        "to" => e.to.id,
        "id" => e.id
      }
      
      if e.java_kind_of?(org.logstash.config.ir.graph.BooleanEdge)
        e_json["when"] = e.edge_type
        e_json["type"] = "boolean"
      else
        e_json["type"] = "plain"
      end
      
      e_json
    end
    
    def format_swm(source_with_metadata)
      return nil unless source_with_metadata
      {
        "source" => {
          "protocol" => source_with_metadata.protocol,
          "id" => source_with_metadata.id,
          "line" =>  source_with_metadata.line,
          "column" => source_with_metadata.column
          # We omit the text of the source code for security reasons
          # raw text may contain passwords
        }
      }
    end
    
  end
  end
end

