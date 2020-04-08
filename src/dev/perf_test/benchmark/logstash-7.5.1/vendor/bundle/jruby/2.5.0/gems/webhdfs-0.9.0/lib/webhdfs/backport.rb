if RUBY_VERSION =~ /^1\.8\./
  require 'cgi'
  def require_relative(relative_feature)
    file = caller.first.split(/:\d/,2).first
    raise LoadError, "require_relative is called in #{$1}" if /\A\((.*)\)/ =~ file
    require File.expand_path(relative_feature, File.dirname(file))
  end

  module URI
    def self.encode_www_form(enum)
      enum.map do |k,v|
        if v.nil?
          CGI::escape(k)
        elsif v.respond_to?(:to_ary)
          v.to_ary.map do |w|
            str = CGI::escape(k)
            unless w.nil?
              str << '='
              str << CGI::escape(w)
            end
          end.join('&')
        else
          str = CGI::escape(k.to_s)
          str << '='
          str << CGI::escape(v.to_s)
        end
      end.join('&')
    end
  end
end
