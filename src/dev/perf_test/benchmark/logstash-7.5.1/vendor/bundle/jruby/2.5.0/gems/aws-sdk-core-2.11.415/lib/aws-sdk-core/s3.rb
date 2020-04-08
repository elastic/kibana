Aws.add_service(:S3, {
  api: "#{Aws::API_DIR}/s3/2006-03-01/api-2.json",
  docs: "#{Aws::API_DIR}/s3/2006-03-01/docs-2.json",
  examples: "#{Aws::API_DIR}/s3/2006-03-01/examples-1.json",
  paginators: "#{Aws::API_DIR}/s3/2006-03-01/paginators-1.json",
  resources: "#{Aws::API_DIR}/s3/2006-03-01/resources-1.json",
  waiters: "#{Aws::API_DIR}/s3/2006-03-01/waiters-2.json",
})

module Aws
  module S3

    autoload :Presigner, 'aws-sdk-core/s3/presigner'
    autoload :BucketRegionCache, 'aws-sdk-core/s3/bucket_region_cache'

    # A cache of discovered bucket regions. You can call `#bucket_added`
    # on this to be notified when you must configure the proper region
    # to access a bucket.
    #
    # This cache is considered an implementation detail.
    #
    # @api private
    BUCKET_REGIONS = BucketRegionCache.new

  end
end
