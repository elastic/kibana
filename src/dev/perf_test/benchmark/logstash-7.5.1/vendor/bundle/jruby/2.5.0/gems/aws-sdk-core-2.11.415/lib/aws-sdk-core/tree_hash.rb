require 'openssl'

module Aws

  # Used for computing a tree hash SHA256 checksum of an object.
  #
  #    tree_hash = TreeHash.new
  #    tree_hash.update(file.read(1024 * 1024)) until file.eof?
  #    tree_hash.digest
  #
  # == Limitations and Notes
  #
  # There are two main limitations to be aware of when using TreeHash:
  #
  # * TreeHash is not thread safe. Use multiple TreeHash objects to concurrently
  #   compute a tree hash of a large object.  Join their hashes at the end into
  #   a single TreeHash and then call {#digest}
  #
  #      TreeHash.new(tree_hashes.map(&:hashes).flatten)
  #
  # * You must call {#update} with 1MB chunks of data.  Only the final
  #   chunk may be smaller than 1MB.
  #
  # If you have a large object/file, and you would like to compute the
  # chunks concurrently, you must break the original file/data into sections
  # that are evenly divisible by 1MB.  Each section of data requires
  # a seperate TreeHash object to compute hashes.  Once all sections of
  # data are complete, you can rejoin their {#hashes} in sequential order
  # into a single TreeHash, then call {#digest} on the final tree hash.
  #
  class TreeHash

    def initialize(hashes = [])
      @digest = OpenSSL::Digest.new('sha256')
      @hashes = hashes
    end

    # @return [Array<String>] The built up list of hashes.  Each hash is
    #   a sha255 digest of a 1MB chunk.
    attr_accessor :hashes

    # @param [String] chunk
    # @return [String] Returns the computed SHA256 digest of the chunk.
    def update(chunk)
      @hashes << @digest.update(chunk).digest
      @digest.reset
      @hashes.last
    end

    def digest
      hashes = @hashes
      digest = OpenSSL::Digest.new('sha256')
      until hashes.count == 1
        hashes = hashes.each_slice(2).map do |h1,h2|
          digest.reset
          if h2
            digest.update(h1)
            digest.update(h2)
            digest.digest
          else
            h1
          end
        end
      end
      hashes.first.bytes.map{|x| x.to_i.to_s(16).rjust(2, '0')}.join('')
    end

  end
end
