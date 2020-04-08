require 'rubygems/remote_fetcher' 

class Gem::RemoteFetcher
  def api_endpoint(uri)
    host = uri.host

    begin
      res = @dns.getresource "_rubygems._tcp.#{host}",
                             Resolv::DNS::Resource::IN::SRV
    rescue Resolv::ResolvError, SocketError => e # patch adds SocketError to list of possible exceptions
      verbose "Getting SRV record failed: #{e}"
      uri
    else
      target = res.target.to_s.strip

      if /\.#{Regexp.quote(host)}\z/ =~ target
        return URI.parse "#{uri.scheme}://#{target}#{uri.path}"
      end

      uri
    end
  end
end
