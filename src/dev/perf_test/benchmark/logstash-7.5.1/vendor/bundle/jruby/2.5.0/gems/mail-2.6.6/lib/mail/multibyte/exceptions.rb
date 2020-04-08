# encoding: utf-8
# frozen_string_literal: true

module Mail #:nodoc:
  module Multibyte #:nodoc:
    # Raised when a problem with the encoding was found.
    class EncodingError < StandardError; end
  end
end