Aws.add_service(:SES, {
  api: "#{Aws::API_DIR}/email/2010-12-01/api-2.json",
  docs: "#{Aws::API_DIR}/email/2010-12-01/docs-2.json",
  examples: "#{Aws::API_DIR}/email/2010-12-01/examples-1.json",
  paginators: "#{Aws::API_DIR}/email/2010-12-01/paginators-1.json",
  waiters: "#{Aws::API_DIR}/email/2010-12-01/waiters-2.json",
})
