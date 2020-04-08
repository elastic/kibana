module Aws
  module Api
    module Docs
      class DocstringProvider

        def initialize(docstrings)
          @docstrings = docstrings
        end

        # @param [String] operation_name
        # @return [String,nil]
        def operation_docs(operation_name)
          clean(@docstrings['operations'][operation_name])
        end

        # @param [String] shape_name
        # @return [String,nil]
        def shape_docs(shape_name)
          clean(shape(shape_name)['base'])
        end

        # @param [String] shape_name
        # @param [String] target
        # @return [String,nil]
        def shape_ref_docs(shape_name, target)
          if ref_docs = shape(shape_name)['refs'][target]
            docs = clean(ref_docs)
            # Running through kramdown to catch unclosed tags that
            # break the client doc pages, see Aws::RDS::Client
            # for an example.
            begin
              require 'kramdown'
              Kramdown::Document.new(docs, input: 'html').to_kramdown.strip
            rescue LoadError
              docs
            end
          else
            shape_docs(shape_name)
          end
        end

        private

        def shape(name)
          @docstrings['shapes'][name] || { 'base' => nil, 'refs' => {} }
        end

        def clean(value)
          if value.nil?
            ''
          else
            value.gsub(/\{(\S+)\}/, '`{\1}`').strip
          end
        end

      end

      class NullDocstringProvider

        def operation_docs(operation_name)
          nil
        end

        def shape_docs(shape_name)
          nil
        end

        def shape_ref_docs(shape_name, target)
          nil
        end

      end
    end
  end
end
