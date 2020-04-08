module Aws
  module Resources
    class Documenter
      class HasOperationDocumenter < BaseOperationDocumenter

        def return_tag
          if plural?
            type = "Array<#{target_resource_class_name}>"
          else
            type = target_resource_class_name
          end
          type += ',nil' if can_return_nil?
          tag("@return [#{type}]")
        end

        def parameters
          if argument?
            arguments.map { |arg| [argument_name(arg), nil] }
          else
            []
          end
        end

        def tags
          tags = super
          if argument?
            arguments.each do |arg|
              tag = "@param [String] #{argument_name(arg)} "
              tag << "The {#{target_resource_class_name}##{argument_name(arg)}} "
              tag << "identifier."
              tags += YARD::DocstringParser.new.parse(tag).to_docstring.tags
            end
          end
          tags
        end

        def plural?
          @operation.builder.plural?
        end

        def argument?
          @operation.arity > 0
        end

        def can_return_nil?
          data_member
        end

        def data_member
          builder.sources.find { |s| BuilderSources::DataMember === s }
        end

        def arguments
          builder.sources.select do |source|
            BuilderSources::Argument === source
          end
        end

        def argument_name(argument)
          argument.target.to_s
        end

      end
    end
  end
end
