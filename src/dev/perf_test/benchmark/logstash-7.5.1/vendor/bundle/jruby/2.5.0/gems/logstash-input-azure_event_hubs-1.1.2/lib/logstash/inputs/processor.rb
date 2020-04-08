# encoding: utf-8
require "logstash/util/loggable"
module LogStash
  module Inputs
    module Azure
      class Processor
        include LogStash::Util::Loggable
        include com.microsoft.azure.eventprocessorhost.IEventProcessor

        def initialize(queue, codec, checkpoint_interval, decorator, meta_data)
          @queue = queue
          @codec = codec
          @checkpoint_interval = checkpoint_interval
          @decorator = decorator
          @meta_data = meta_data
          @logger = self.logger

        end

        def onOpen(context)
          @logger.info("Event Hub: #{context.getEventHubPath.to_s}, Partition: #{context.getPartitionId.to_s} is opening.")
        end

        def onClose(context, reason)
          @logger.info("Event Hub: #{context.getEventHubPath.to_s}, Partition: #{context.getPartitionId.to_s} is closing. (reason=#{reason.to_s})")
        end

        def onEvents(context, batch)
          @logger.debug("Event Hub: #{context.getEventHubPath.to_s}, Partition: #{context.getPartitionId.to_s} is processing a batch.") if @logger.debug?
          last_payload = nil
          batch_size = 0
          batch.each do |payload|
            last_checkpoint = Time.now.to_i
            bytes = payload.getBytes
            batch_size += bytes.size
            @logger.trace("Event Hub: #{context.getEventHubPath.to_s}, Partition: #{context.getPartitionId.to_s}, Offset: #{payload.getSystemProperties.getOffset.to_s},"+
                              " Sequence: #{payload.getSystemProperties.getSequenceNumber.to_s}, Size: #{bytes.size}") if @logger.trace?

            @codec.decode(bytes.to_a.pack('C*')) do |event|

              @decorator.call(event)
              if @meta_data
                event.set("[@metadata][azure_event_hubs][name]", context.getEventHubPath)
                event.set("[@metadata][azure_event_hubs][consumer_group]", context.getConsumerGroupName)
                event.set("[@metadata][azure_event_hubs][processor_host]", context.getOwner)
                event.set("[@metadata][azure_event_hubs][partition]", context.getPartitionId)
                event.set("[@metadata][azure_event_hubs][offset]", payload.getSystemProperties.getOffset)
                event.set("[@metadata][azure_event_hubs][sequence]", payload.getSystemProperties.getSequenceNumber)
                event.set("[@metadata][azure_event_hubs][timestamp]",payload.getSystemProperties.getEnqueuedTime.getEpochSecond)
                event.set("[@metadata][azure_event_hubs][event_size]", bytes.size)
              end
              @queue << event
              if @checkpoint_interval > 0
                now = Time.now.to_i
                since_last_check_point = now - last_checkpoint
                if since_last_check_point >= @checkpoint_interval
                  context.checkpoint(payload).get
                  last_checkpoint = now
                end
              end
            end
            last_payload = payload
          end

          @codec.flush
          #always create checkpoint at end of onEvents in case of sparse events
          context.checkpoint(last_payload).get if last_payload
          @logger.debug("Event Hub: #{context.getEventHubPath.to_s}, Partition: #{context.getPartitionId.to_s} finished processing a batch of #{batch_size} bytes.") if @logger.debug?
        end

        def onError(context, error)
          @logger.error("Event Hub: #{context.getEventHubPath.to_s}, Partition: #{context.getPartitionId.to_s} experienced an error #{error.to_s})")
        end
      end
    end
  end
end





