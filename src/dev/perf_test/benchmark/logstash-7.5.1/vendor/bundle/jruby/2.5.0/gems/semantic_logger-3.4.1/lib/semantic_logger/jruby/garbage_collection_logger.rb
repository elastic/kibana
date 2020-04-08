module SemanticLogger
  module JRuby
    class GarbageCollectionLogger
      include Java::JavaxManagement::NotificationListener

      # Only log the garbage collection if the number of microseconds exceeds
      # this value
      def initialize(min_microseconds = 10000)
        @min_microseconds = min_microseconds
      end

      # Must leave the method name as-is so that it can be found by Java
      def handleNotification(notification, _)
        # Only care about GARBAGE_COLLECTION_NOTIFICATION notifications
        return unless notification.get_type == Java::ComSunManagement::GarbageCollectionNotificationInfo::GARBAGE_COLLECTION_NOTIFICATION

        info     = Java::ComSunManagement::GarbageCollectionNotificationInfo.from(notification.user_data)
        gc_info  = info.gc_info
        duration = gc_info.duration
        if duration >= @min_microseconds
          SemanticLogger['GarbageCollector'].measure_warn "Garbage Collection completed: #{info.gc_name} ##{gc_info.id}", duration: duration.to_f / 1000
        end
      end
    end

  end
end
