# encoding: utf-8
require "logstash/util"
require "aws-sdk"

module LogStash
  module Outputs
    class S3
      class Uploader
        TIME_BEFORE_RETRYING_SECONDS = 1
        DEFAULT_THREADPOOL = Concurrent::ThreadPoolExecutor.new({
                                                                  :min_threads => 1,
                                                                  :max_threads => 8,
                                                                  :max_queue => 1,
                                                                  :fallback_policy => :caller_runs
                                                                })


        attr_reader :bucket, :upload_options, :logger

        def initialize(bucket, logger, threadpool = DEFAULT_THREADPOOL)
          @bucket = bucket
          @workers_pool = threadpool
          @logger = logger
        end

        def upload_async(file, options = {})
          @workers_pool.post do
            LogStash::Util.set_thread_name("S3 output uploader, file: #{file.path}")
            upload(file, options)
          end
        end

        def upload(file, options = {})
          upload_options = options.fetch(:upload_options, {})

          begin
            obj = bucket.object(file.key)
            obj.upload_file(file.path, upload_options)
          rescue Errno::ENOENT => e
            logger.error("File doesn't exist! Unrecoverable error.", :exception => e.class, :message => e.message, :path => file.path, :backtrace => e.backtrace)
          rescue => e
            # When we get here it usually mean that S3 tried to do some retry by himself (default is 3)
            # When the retry limit is reached or another error happen we will wait and retry.
            #
            # Thread might be stuck here, but I think its better than losing anything
            # its either a transient errors or something bad really happened.
            logger.error("Uploading failed, retrying.", :exception => e.class, :message => e.message, :path => file.path, :backtrace => e.backtrace)
            sleep TIME_BEFORE_RETRYING_SECONDS
            retry
          end

          options[:on_complete].call(file) unless options[:on_complete].nil?
        rescue => e
          logger.error("An error occured in the `on_complete` uploader", :exception => e.class, :message => e.message, :path => file.path, :backtrace => e.backtrace)
          raise e # reraise it since we don't deal with it now
        end

        def stop
          @workers_pool.shutdown
          @workers_pool.wait_for_termination(nil) # block until its done
        end
      end
    end
  end
end
