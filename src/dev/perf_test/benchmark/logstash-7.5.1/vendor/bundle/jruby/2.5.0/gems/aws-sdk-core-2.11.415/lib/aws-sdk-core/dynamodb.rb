Aws.add_service(:DynamoDB, {
  api: "#{Aws::API_DIR}/dynamodb/2012-08-10/api-2.json",
  docs: "#{Aws::API_DIR}/dynamodb/2012-08-10/docs-2.json",
  examples: "#{Aws::API_DIR}/dynamodb/2012-08-10/examples-1.json",
  paginators: "#{Aws::API_DIR}/dynamodb/2012-08-10/paginators-1.json",
  resources: "#{Aws::API_DIR}/dynamodb/2012-08-10/resources-1.json",
  waiters: "#{Aws::API_DIR}/dynamodb/2012-08-10/waiters-2.json",
})

module Aws
  module DynamoDB
    autoload :AttributeValue, 'aws-sdk-core/dynamodb/attribute_value'

    class Client

      def data_to_http_resp(operation_name, data)
        api = config.api
        operation = api.operation(operation_name)
        translator = Plugins::DynamoDBSimpleAttributes::ValueTranslator
        translator = translator.new(operation.output, :marshal)
        data = translator.apply(data)
        ParamValidator.validate!(operation.output, data)
        protocol_helper.stub_data(api, operation, data)
      end

      def stub_data(operation_name, data = {})
        if config.simple_attributes
          rules = config.api.operation(operation_name).output
          translator = Plugins::DynamoDBSimpleAttributes::ValueTranslator
          data = translator.apply(rules, :marshal, data)
          data = super(operation_name, data)
          translator.apply(rules, :unmarshal, data)
        else
          super
        end
      end

    end
  end
end
