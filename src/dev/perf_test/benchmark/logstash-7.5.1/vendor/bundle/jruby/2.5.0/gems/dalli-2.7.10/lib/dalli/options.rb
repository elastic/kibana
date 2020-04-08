# frozen_string_literal: true
require 'thread'
require 'monitor'

module Dalli

  # Make Dalli threadsafe by using a lock around all
  # public server methods.
  #
  # Dalli::Server.extend(Dalli::Threadsafe)
  #
  module Threadsafe
    def self.extended(obj)
      obj.init_threadsafe
    end

    def request(op, *args)
      @lock.synchronize do
        super
      end
    end

    def alive?
      @lock.synchronize do
        super
      end
    end

    def close
      @lock.synchronize do
        super
      end
    end

    def multi_response_start
      @lock.synchronize do
        super
      end
    end

    def multi_response_nonblock
      @lock.synchronize do
        super
      end
    end

    def multi_response_abort
      @lock.synchronize do
        super
      end
    end

    def lock!
      @lock.mon_enter
    end

    def unlock!
      @lock.mon_exit
    end

    def init_threadsafe
      @lock = Monitor.new
    end
  end
end
