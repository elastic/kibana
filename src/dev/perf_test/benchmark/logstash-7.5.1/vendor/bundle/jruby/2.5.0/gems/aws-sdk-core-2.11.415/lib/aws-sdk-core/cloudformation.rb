Aws.add_service(:CloudFormation, {
  api: "#{Aws::API_DIR}/cloudformation/2010-05-15/api-2.json",
  docs: "#{Aws::API_DIR}/cloudformation/2010-05-15/docs-2.json",
  examples: "#{Aws::API_DIR}/cloudformation/2010-05-15/examples-1.json",
  paginators: "#{Aws::API_DIR}/cloudformation/2010-05-15/paginators-1.json",
  resources: "#{Aws::API_DIR}/cloudformation/2010-05-15/resources-1.json",
  waiters: "#{Aws::API_DIR}/cloudformation/2010-05-15/waiters-2.json",
})
