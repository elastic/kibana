Aws.add_service(:Glacier, {
  api: "#{Aws::API_DIR}/glacier/2012-06-01/api-2.json",
  docs: "#{Aws::API_DIR}/glacier/2012-06-01/docs-2.json",
  examples: "#{Aws::API_DIR}/glacier/2012-06-01/examples-1.json",
  paginators: "#{Aws::API_DIR}/glacier/2012-06-01/paginators-1.json",
  resources: "#{Aws::API_DIR}/glacier/2012-06-01/resources-1.json",
  waiters: "#{Aws::API_DIR}/glacier/2012-06-01/waiters-2.json",
})
