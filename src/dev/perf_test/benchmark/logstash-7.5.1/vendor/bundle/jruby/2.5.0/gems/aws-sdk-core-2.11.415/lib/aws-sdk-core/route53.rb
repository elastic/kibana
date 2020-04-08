Aws.add_service(:Route53, {
  api: "#{Aws::API_DIR}/route53/2013-04-01/api-2.json",
  docs: "#{Aws::API_DIR}/route53/2013-04-01/docs-2.json",
  examples: "#{Aws::API_DIR}/route53/2013-04-01/examples-1.json",
  paginators: "#{Aws::API_DIR}/route53/2013-04-01/paginators-1.json",
  waiters: "#{Aws::API_DIR}/route53/2013-04-01/waiters-2.json",
})
