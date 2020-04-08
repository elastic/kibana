Aws.add_service(:CloudWatch, {
  api: "#{Aws::API_DIR}/monitoring/2010-08-01/api-2.json",
  docs: "#{Aws::API_DIR}/monitoring/2010-08-01/docs-2.json",
  examples: "#{Aws::API_DIR}/monitoring/2010-08-01/examples-1.json",
  paginators: "#{Aws::API_DIR}/monitoring/2010-08-01/paginators-1.json",
  resources: "#{Aws::API_DIR}/monitoring/2010-08-01/resources-1.json",
  waiters: "#{Aws::API_DIR}/monitoring/2010-08-01/waiters-2.json",
})
