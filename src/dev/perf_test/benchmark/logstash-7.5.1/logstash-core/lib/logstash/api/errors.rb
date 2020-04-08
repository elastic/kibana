# encoding: utf-8
module LogStash
  module Api
    class ApiError < StandardError;
      def initialize(message = nil)
        super(message || "Api Error")
      end

      def status_code
        500
      end

      def to_hash
        { :message => to_s }
      end
    end

    class NotFoundError < ApiError
      def initialize
        super("Not Found")
      end

      def status_code
        404
      end
    end
  end
end
