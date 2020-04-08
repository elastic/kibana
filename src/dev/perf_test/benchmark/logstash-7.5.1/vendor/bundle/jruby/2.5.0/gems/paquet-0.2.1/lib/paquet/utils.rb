# encoding: utf-8
require "fileutils"
require "uri"

module Paquet
  class Utils
    HTTPS_SCHEME = "https"
    REDIRECTION_LIMIT = 5

    def self.download_file(source, destination, counter = REDIRECTION_LIMIT)
      raise "Too many redirection" if counter == 0

      begin
        f = File.open(destination, "wb")

        uri = URI.parse(source)

        http = Net::HTTP.new(uri.host, uri.port, )
        http.use_ssl = uri.scheme ==  HTTPS_SCHEME

        response = http.get(uri.path)

        case response
        when Net::HTTPSuccess
          f.write(response.body)
        when Net::HTTPRedirection
          counter -= 1
          download_file(response['location'], destination, counter)
        else
          raise "Response not handled: #{response.class}, path: #{uri.path}"
        end
        f.path
      rescue => e
        FileUtils.rm_rf(f.path) rescue nil
        raise e
      ensure
        f.close
      end
    end
  end
end
