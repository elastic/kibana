Aws.add_service(:RDS, {
  api: "#{Aws::API_DIR}/rds/2014-10-31/api-2.json",
  docs: "#{Aws::API_DIR}/rds/2014-10-31/docs-2.json",
  examples: "#{Aws::API_DIR}/rds/2014-10-31/examples-1.json",
  paginators: "#{Aws::API_DIR}/rds/2014-10-31/paginators-1.json",
  resources: "#{Aws::API_DIR}/rds/2014-10-31/resources-1.json",
  waiters: "#{Aws::API_DIR}/rds/2014-10-31/waiters-2.json",
})

module Aws
  module RDS

    autoload :AuthTokenGenerator, 'aws-sdk-core/rds/auth_token_generator'

  end
end
