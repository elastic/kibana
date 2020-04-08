# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require "concurrent"

module LogStash module Inputs
  class TimerTaskLogger
    include LogStash::Util::Loggable

    def update(run_at, result, exception)
      if !exception.nil?
        # This can happen if the pipeline is blocked for too long
        if exception.is_a?(Concurrent::TimeoutError)
          logger.debug("metric shipper took too much time to complete", :exception => exception.class, :message => exception.message)
        else
          logger.error("metric shipper exception", :exception => exception.class, :message => exception.message)
        end
      end
    end
  end
end end
