require 'json'

module Aws
  module Resources
    class Documenter

      autoload :BaseOperationDocumenter, 'aws-sdk-resources/documenter/base_operation_documenter'
      autoload :HasOperationDocumenter, 'aws-sdk-resources/documenter/has_operation_documenter'
      autoload :HasManyOperationDocumenter, 'aws-sdk-resources/documenter/has_many_operation_documenter'
      autoload :OperationDocumenter, 'aws-sdk-resources/documenter/operation_documenter'
      autoload :ResourceOperationDocumenter, 'aws-sdk-resources/documenter/resource_operation_documenter'
      autoload :WaiterOperationDocumenter, 'aws-sdk-resources/documenter/waiter_operation_documenter'

      class << self

        include Seahorse::Model::Shapes

        def apply_customizations
          document_s3_object_upload_file_additional_options
          document_s3_object_copy_from_options
        end

        private

        def document_s3_object_upload_file_additional_options
          input = Aws::S3::Client.api.operation(:create_multipart_upload).input
          opts = input.shape.member_names - [:bucket, :key]
          tags = opts.map do |opt|
            ref = input.shape.member(opt)
            type = case ref.shape
            when StructureShape then 'Structure'
            when ListShape then 'Array'
            when MapShape then 'Hash'
            when StringShape then 'String'
            when IntegerShape then 'Integer'
            when FloatShape then 'Float'
            when BooleanShape then 'Boolean'
            when TimestampShape then 'Time'
            when BlobShape then 'IO'
            else
              raise "unhandled shape class `#{ref.shape.class.name}'"
            end
            docs = ref.documentation || ref.shape.documentation
            "@option options [#{type}] :#{opt} #{docs}"
          end
          tags = YARD::DocstringParser.new.parse(tags).to_docstring.tags
          m = YARD::Registry['Aws::S3::Object#upload_file']
          tags.each { |tag| m.add_tag(tag) }
        end

        def document_s3_object_copy_from_options
          copy_from = YARD::Registry['Aws::S3::Object#copy_from']
          copy_to = YARD::Registry['Aws::S3::Object#copy_to']
          existing_tags = copy_from.tags
          existing_tags.each do |tag|
            if tag.tag_name == 'option' && tag.pair.name != ":copy_source"
              copy_from.add_tag(tag)
              copy_to.add_tag(tag)
            end
          end
        end

        def tag(string)
          YARD::DocstringParser.new.parse(string).to_docstring.tags.first
        end

      end
    end
  end
end
