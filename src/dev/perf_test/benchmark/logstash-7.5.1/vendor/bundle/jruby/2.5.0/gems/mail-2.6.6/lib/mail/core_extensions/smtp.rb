# encoding: utf-8
# frozen_string_literal: true
module Net
  class SMTP
    # This is a backport of r30294 from ruby trunk because of a bug in net/smtp.
    # http://svn.ruby-lang.org/cgi-bin/viewvc.cgi?view=rev&amp;revision=30294
    #
    # Fixed in what will be Ruby 1.9.3 - tlsconnect also does not exist in some early versions of ruby
    begin
      alias_method :original_tlsconnect, :tlsconnect

      def tlsconnect(s)
        verified = false
        begin
          original_tlsconnect(s).tap { verified = true }
        ensure
          unless verified
            s.close rescue nil
          end
        end
      end
    rescue NameError
    end
  end
end
