require File.expand_path('../integration', __FILE__)

module Adapters
  class DefaultTest < Faraday::TestCase

    def adapter() :default end

    Integration.apply(self, :NonParallel) do
      # default stack is not configured with Multipart
      undef :test_POST_sends_files
    end

  end
end
