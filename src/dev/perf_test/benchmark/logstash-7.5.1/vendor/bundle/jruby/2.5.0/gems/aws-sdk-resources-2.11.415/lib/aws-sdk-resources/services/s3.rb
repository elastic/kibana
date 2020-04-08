module Aws
  module S3

    require 'aws-sdk-resources/services/s3/bucket'
    require 'aws-sdk-resources/services/s3/object'
    require 'aws-sdk-resources/services/s3/object_summary'
    require 'aws-sdk-resources/services/s3/multipart_upload'

    autoload :Encryption, 'aws-sdk-resources/services/s3/encryption'
    autoload :FilePart, 'aws-sdk-resources/services/s3/file_part'
    autoload :FileUploader, 'aws-sdk-resources/services/s3/file_uploader'
    autoload :FileDownloader, 'aws-sdk-resources/services/s3/file_downloader'
    autoload :MultipartFileUploader, 'aws-sdk-resources/services/s3/multipart_file_uploader'
    autoload :MultipartUploadError, 'aws-sdk-resources/services/s3/multipart_upload_error'
    autoload :ObjectCopier, 'aws-sdk-resources/services/s3/object_copier'
    autoload :ObjectMultipartCopier, 'aws-sdk-resources/services/s3/object_multipart_copier'
    autoload :PresignedPost, 'aws-sdk-resources/services/s3/presigned_post'

  end
end
