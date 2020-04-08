require 'cgi'

module Seahorse
  # @api private
  module Util
    class << self

      def irregular_inflections(hash)
        @irregular_inflections.update(hash)
        @irregular_regex = Regexp.new(@irregular_inflections.keys.join('|'))
      end

      # @param [String] string
      # @return [String] Returns the underscored version of the given string.
      def underscore(string)
        new_string = string.dup
        new_string.gsub!(@irregular_regex) { |word| "_#{@irregular_inflections[word]}" }
        new_string.gsub!(/([A-Z0-9]+)([A-Z][a-z])/, '\1_\2'.freeze)
        new_string = new_string.scan(/[a-z0-9]+|\d+|[A-Z0-9]+[a-z]*/).join('_'.freeze)
        new_string.downcase!
        new_string
      end

      def uri_escape(string)
        CGI.escape(string.encode('UTF-8')).gsub('+', '%20').gsub('%7E', '~')
      end

      def uri_path_escape(path)
        path.gsub(/[^\/]+/) { |part| uri_escape(part) }
      end

    end

    @irregular_inflections = {}

    irregular_inflections('ETag' => 'etag')

  end
end
