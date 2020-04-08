=begin
= $RCSfile$ -- Ruby-space definitions that completes C-space funcs for SSL

= Info
  'OpenSSL for Ruby 2' project
  Copyright (C) 2001 GOTOU YUUZOU <gotoyuzo@notwork.org>
  All rights reserved.

= Licence
  This program is licenced under the same licence as Ruby.
  (See the file 'LICENCE'.)

= Version
  $Id$
=end

require "openssl/buffering"
require 'fcntl' # used by OpenSSL::SSL::Nonblock (if loaded)

module OpenSSL
  module SSL
    class SSLContext
      DEFAULT_PARAMS = {
          :ssl_version => "SSLv23",
          :verify_mode => OpenSSL::SSL::VERIFY_PEER,
          :ciphers => %w{
          ECDHE-ECDSA-AES128-GCM-SHA256
          ECDHE-RSA-AES128-GCM-SHA256
          ECDHE-ECDSA-AES256-GCM-SHA384
          ECDHE-RSA-AES256-GCM-SHA384
          DHE-RSA-AES128-GCM-SHA256
          DHE-DSS-AES128-GCM-SHA256
          DHE-RSA-AES256-GCM-SHA384
          DHE-DSS-AES256-GCM-SHA384
          ECDHE-ECDSA-AES128-SHA256
          ECDHE-RSA-AES128-SHA256
          ECDHE-ECDSA-AES128-SHA
          ECDHE-RSA-AES128-SHA
          ECDHE-ECDSA-AES256-SHA384
          ECDHE-RSA-AES256-SHA384
          ECDHE-ECDSA-AES256-SHA
          ECDHE-RSA-AES256-SHA
          DHE-RSA-AES128-SHA256
          DHE-RSA-AES256-SHA256
          DHE-RSA-AES128-SHA
          DHE-RSA-AES256-SHA
          DHE-DSS-AES128-SHA256
          DHE-DSS-AES256-SHA256
          DHE-DSS-AES128-SHA
          DHE-DSS-AES256-SHA
          AES128-GCM-SHA256
          AES256-GCM-SHA384
          AES128-SHA256
          AES256-SHA256
          AES128-SHA
          AES256-SHA
          ECDHE-ECDSA-RC4-SHA
          ECDHE-RSA-RC4-SHA
          RC4-SHA
        }.join(":"),
          :options => -> {
            opts = OpenSSL::SSL::OP_ALL
            opts &= ~OpenSSL::SSL::OP_DONT_INSERT_EMPTY_FRAGMENTS if defined?(OpenSSL::SSL::OP_DONT_INSERT_EMPTY_FRAGMENTS)
            opts |= OpenSSL::SSL::OP_NO_COMPRESSION if defined?(OpenSSL::SSL::OP_NO_COMPRESSION)
            opts |= OpenSSL::SSL::OP_NO_SSLv2 if defined?(OpenSSL::SSL::OP_NO_SSLv2)
            opts |= OpenSSL::SSL::OP_NO_SSLv3 if defined?(OpenSSL::SSL::OP_NO_SSLv3)
            opts
          }.call
      } unless const_defined? :DEFAULT_PARAMS # JRuby does it in Java

      begin
        DEFAULT_CERT_STORE = OpenSSL::X509::Store.new
        DEFAULT_CERT_STORE.set_default_paths
        if defined?(OpenSSL::X509::V_FLAG_CRL_CHECK_ALL)
          DEFAULT_CERT_STORE.flags = OpenSSL::X509::V_FLAG_CRL_CHECK_ALL
        end
      end unless const_defined? :DEFAULT_CERT_STORE

      def set_params(params={})
        params = DEFAULT_PARAMS.merge(params)
        params.each{|name, value| self.__send__("#{name}=", value) }
        if self.verify_mode != OpenSSL::SSL::VERIFY_NONE
          unless self.ca_file or self.ca_path or self.cert_store
            self.cert_store = DEFAULT_CERT_STORE
          end
        end
        return params
      end unless method_defined? :set_params
    end

    module SocketForwarder
      def addr
        to_io.addr
      end

      def peeraddr
        to_io.peeraddr
      end

      def setsockopt(level, optname, optval)
        to_io.setsockopt(level, optname, optval)
      end

      def getsockopt(level, optname)
        to_io.getsockopt(level, optname)
      end

      def fcntl(*args)
        to_io.fcntl(*args)
      end

      def closed?
        to_io.closed?
      end

      def do_not_reverse_lookup=(flag)
        to_io.do_not_reverse_lookup = flag
      end
    end

    def verify_certificate_identity(cert, hostname)
      should_verify_common_name = true
      cert.extensions.each { |ext|
        next if ext.oid != "subjectAltName"
        ext.value.split(/,\s+/).each { |general_name|
          # MRI 1.9.3 (since we parse ASN.1 differently)
          # when 2 # dNSName in GeneralName (RFC5280)
          if /\ADNS:(.*)/ =~ general_name
            should_verify_common_name = false
            reg = Regexp.escape($1).gsub(/\\\*/, "[^.]+")
            return true if /\A#{reg}\z/i =~ hostname
          # MRI 1.9.3 (since we parse ASN.1 differently)
          # when 7 # iPAddress in GeneralName (RFC5280)
          elsif /\AIP(?: Address)?:(.*)/ =~ general_name
            should_verify_common_name = false
            return true if $1 == hostname
            # NOTE: bellow logic makes little sense as we read exts differently
            #value = $1 # follows GENERAL_NAME_print() in x509v3/v3_alt.c
            #if value.size == 4
            #  return true if value.unpack('C*').join('.') == hostname
            #elsif value.size == 16
            #  return true if value.unpack('n*').map { |e| sprintf("%X", e) }.join(':') == hostname
            #end
          end
        }
      }
      if should_verify_common_name
        cert.subject.to_a.each { |oid, value|
          if oid == "CN"
            reg = Regexp.escape(value).gsub(/\\\*/, "[^.]+")
            return true if /\A#{reg}\z/i =~ hostname
          end
        }
      end
      return false
    end
    module_function :verify_certificate_identity

    class SSLSocket
      include Buffering
      include SocketForwarder
      include Nonblock

      def sysclose
        return if closed?
        stop
        io.close if sync_close
      end unless method_defined? :sysclose

      def post_connection_check(hostname)
        unless OpenSSL::SSL.verify_certificate_identity(peer_cert, hostname)
          raise SSLError, "hostname does not match the server certificate"
        end
        return true
      end

    end

    class SSLServer
      include SocketForwarder
      attr_accessor :start_immediately

      def initialize(svr, ctx)
        @svr = svr
        @ctx = ctx
        unless ctx.session_id_context
          session_id = OpenSSL::Digest::MD5.hexdigest($0)
          @ctx.session_id_context = session_id
        end
        @start_immediately = true
      end

      def to_io
        @svr
      end

      def listen(backlog=5)
        @svr.listen(backlog)
      end

      def shutdown(how=Socket::SHUT_RDWR)
        @svr.shutdown(how)
      end

      def accept
        sock = @svr.accept
        begin
          ssl = OpenSSL::SSL::SSLSocket.new(sock, @ctx)
          ssl.sync_close = true
          ssl.accept if @start_immediately
          ssl
        rescue SSLError => ex
          sock.close
          raise ex
        end
      end

      def close
        @svr.close
      end
    end
  end
end
