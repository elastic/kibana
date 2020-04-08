Aws.add_service(:Polly, {
  api: "#{Aws::API_DIR}/polly/2016-06-10/api-2.json",
  docs: "#{Aws::API_DIR}/polly/2016-06-10/docs-2.json",
  examples: "#{Aws::API_DIR}/polly/2016-06-10/examples-1.json",
  paginators: "#{Aws::API_DIR}/polly/2016-06-10/paginators-1.json",
})

module Aws
  module Polly

    autoload :Presigner, 'aws-sdk-core/polly/presigner'

  end
end
