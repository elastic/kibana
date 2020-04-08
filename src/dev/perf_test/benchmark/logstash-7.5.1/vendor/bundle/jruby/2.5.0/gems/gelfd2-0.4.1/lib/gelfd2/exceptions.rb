module Gelfd2
  class NotChunkedDataError < StandardError; end
  class DuplicateChunkError < StandardError; end
  class TooManyChunksError < StandardError; end
  class UnknownHeaderError < StandardError; end
  class DecodeError < StandardError; end
  class NotYetImplementedError < StandardError; end
end
