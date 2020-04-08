require 'openssl'

module Aws
  module Plugins

    # Computes the `:checksum` of the HTTP request body for operations
    # that require the `X-Amz-Sha256-Tree-Hash` header.  This includes:
    #
    # * `:complete_multipart_upload`
    # * `:upload_archive`
    # * `:upload_multipart_part`
    #
    # The `:upload_archive` and `:upload_multipart_part` operations
    # accept a `:checksum` request parameter.  If this param
    # is present, then the checksum is assumed to be the proper
    # tree hash of the file to be uploaded.  If this param is
    # not present, then the required tree hash checksum will
    # be generated.
    #
    # The `:complete_multipart_upload` operation does not accept
    # a checksum and this plugin will always compute this of the
    # HTTP request body on your behalf.
    class GlacierChecksums < Seahorse::Client::Plugin

      CHECKSUM_OPERATIONS = [
        :upload_archive,
        :upload_multipart_part,
      ]

      class Handler < Seahorse::Client::Handler

        HASH = 'X-Amz-Content-Sha256'

        TREE_HASH = 'X-Amz-Sha256-Tree-Hash'

        def call(context)
          unless context.http_request.headers[TREE_HASH]
            populate_checksum_headers(context)
          end
          @handler.call(context)
        end

        private

        def populate_checksum_headers(context)
          compute_checksums(context.http_request.body) do |hash, tree_hash|
            context.http_request.headers[HASH] = hash
            context.http_request.headers[TREE_HASH] = tree_hash.digest
            context[:tree_hash] = tree_hash
          end
        end

        # Computes two checksums of the body.  The tree hash is required
        # by Glacier for operations where you upload a file.  The other
        # checksum is required by signature version 4.  We compute both
        # here so the sigv4 signer does not need to re-read the body.
        def compute_checksums(body, &block)

          tree_hash = TreeHash.new
          digest = OpenSSL::Digest.new('sha256')

          # if the body is empty/EOF, then we should compute the
          # digests of the empty string
          if body.size == 0
            tree_hash.update('')
            digest.update('')
          end

          # Rewind body before performing checksum computation.
          body.rewind

          while chunk = body.read(1024 * 1024) # read 1MB
            tree_hash.update(chunk)
            digest.update(chunk)
          end
          body.rewind

          yield(digest.to_s, tree_hash)

        end
      end

      handler(Handler, operations: CHECKSUM_OPERATIONS)

    end
  end
end
