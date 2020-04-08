# encoding: utf-8
require "logstash/namespace"
require "thread_safe"
require "concurrent"

# This class is a Codec duck type
# Using Composition, it maps from a stream identity to
# a cloned codec instance via the same API as a Codec
# it implements the codec public API

module LogStash module Codecs class IdentityMapCodec
  # subclass of Exception, LS has more than limit (20000) active streams
  class IdentityMapUpperLimitException < Exception; end

  module EightyPercentWarning
    extend self
    def visit(imc)
      current_size, limit = imc.current_size_and_limit
      return if current_size < (limit * 0.8)
      imc.logger.warn("IdentityMapCodec has reached 80% capacity",
        :current_size => current_size, :upper_limit => limit)
    end
  end

  module UpperLimitReached
    extend self
    def visit(imc)
      current_size, limit = imc.current_size_and_limit
      return if current_size < limit
      # we hit the limit
      # try to clean out stale streams
      current_size, limit = imc.map_cleanup
      return if current_size < limit
      # we are still at the limit and all streams are in use
      imc.logger.error("IdentityMapCodec has reached 100% capacity",
          :current_size => current_size, :upper_limit => limit)
      raise IdentityMapUpperLimitException.new
    end
  end

  class PeriodicRunner
    def initialize(listener, interval, method_symbol)
      @listener, @interval = listener, interval
      @method_symbol = method_symbol
      @running = Concurrent::AtomicBoolean.new(false)
    end

    def start
      return self if running?
      @running.make_true
      @thread = Thread.new() do
        while running? do
          sleep @interval
          break if !running?
          break if @listener.nil?
          @listener.send(@method_symbol)
        end
      end
      self
    end

    def running?
      @running.true?
    end

    def stop
      return if !running?
      @running.make_false
      if @thread.alive?
        @thread.wakeup
        @thread.join
      end
      @listener = nil
    end
  end

  class NoopRunner
    attr_reader :start, :stop
    def running?() false; end
  end

  # A composite class to hold both the codec, the eviction_timeout and a last_used timestamp
  # instances of this Value Object are stored in the mapping hash
  class CodecValue
    attr_reader :codec
    attr_accessor :eviction_timeout, :auto_flush_timeout

    def initialize(codec)
      @codec = codec
    end
  end

  #maximum size of the mapping hash
  MAX_IDENTITIES = 20_000

  # time after which a stream is
  # considered stale
  # each time a stream is accessed
  # it is given a new timeout
  EVICT_TIMEOUT = 60 * 60 * 1 # 1 hour

  # time that the cleaner thread sleeps for
  # before it tries to clean out stale mappings
  CLEANER_INTERVAL = 60 * 5 # 5 minutes

  attr_reader :identity_map
  attr_accessor :base_codec, :cleaner, :auto_flusher

  def initialize(codec)
    @base_codec = codec
    @base_codecs = [codec]
    @identity_map = ThreadSafe::Hash.new &method(:codec_builder)
    @max_identities = MAX_IDENTITIES
    @evict_timeout = EVICT_TIMEOUT
    cleaner_interval(CLEANER_INTERVAL)
    if codec.respond_to?(:use_mapper_auto_flush) &&
        (@auto_flush_interval = codec.use_mapper_auto_flush)
      @auto_flusher = PeriodicRunner.new(self, 0.5, :auto_flush_mapped)
    else
      @auto_flusher = NoopRunner.new
    end

    @decode_block = lambda {|*| true }
    @eviction_block = nil
  end

  # ==============================================
  # Constructional/builder methods
  # chain this method off of new
  #
  # used to add a non-default maximum identities
  def max_identities(max)
    @max_identities = max.to_i
    self
  end

  # used to add a non-default evict timeout
  def evict_timeout(timeout)
    @evict_timeout = timeout.to_i
    self
  end

  # used to add  a non-default cleaner interval
  def cleaner_interval(interval)
    @cleaner.stop if @cleaner
    @cleaner = PeriodicRunner.new(self, interval.to_i, :map_cleanup)
    self
  end

  # used to add  a non-default eviction block
  def eviction_block(block)
    @eviction_block = block
    self
  end

  # end Constructional/builder methods
  # ==============================================

  # ==============================================
  # IdentityMapCodec API
  def evict(identity)
    # maybe called more than once
    if (compo = identity_map.delete(identity))
      compo.codec.auto_flush if compo.codec.respond_to?(:auto_flush)
    end
  end
  # end IdentityMapCodec API
  # ==============================================

  # ==============================================
  # Codec API
  def decode(data, identity = nil, &block)
    @decode_block = block if @decode_block != block
    stream_codec(identity).decode(data, &block)
  end

  def accept(listener)
    stream_codec(listener.path).accept(listener)
  end

  alias_method :<<, :decode

  def encode(event, identity = nil)
    stream_codec(identity).encode(event)
  end

  def flush(&block)
    all_codecs.each do |codec|
      #let ruby do its default args thing
      if block_given?
        codec.flush(&block)
      else
        if codec.respond_to?(:auto_flush)
          codec.auto_flush
        else
          #try this, no guarantees
          codec.flush
        end
      end
    end
  end

  def close()
    cleaner.stop
    auto_flusher.stop
    all_codecs.each(&:close)
  end
  # end Codec API
  # ==============================================

  def auto_flush_mapped
    if !identity_count.zero?
      nowf = Time.now.to_f
      identity_map.each do |identity, compo|
        next if compo.auto_flush_timeout.zero?
        next unless nowf > compo.auto_flush_timeout
        compo.codec.auto_flush
        # at eof (tail and read) no more lines for a while or ever
        # so reset compo.auto_flush_timeout
        compo.auto_flush_timeout = 0
      end
    end
  end

  def flush_mapped(listener)
    listener_has_path = listener.respond_to?(:path)
    identity_map.each do |identity, compo|
      listener.path = identity if listener_has_path
      compo.codec.auto_flush(listener)
    end
  end

  def all_codecs
    no_streams? ? @base_codecs : identity_map.values.map(&:codec)
  end

  def max_limit
    @max_identities
  end

  def identity_count
    identity_map.size
  end

  # support cleaning of stale stream/codecs
  # a stream is considered stale if it has not
  # been accessed in the last @evict_timeout
  # period (default 1 hour)
  def map_cleanup
    if !identity_count.zero?
      nowi = Time.now.to_i
      # delete_if is atomic
      # contents should not mutate during this call
      identity_map.delete_if do |identity, compo|
        if (flag = compo.eviction_timeout <= nowi)
          evict_flush(compo.codec)
        end
        flag
      end
    end
    current_size_and_limit
  end

  def evict_flush(codec)
    if codec.respond_to?(:auto_flush)
      codec.auto_flush
    else
      if (block = @eviction_block || @decode_block)
        codec.flush(&block)
      end
      # all else - can't do anything
    end
  end

  def current_size_and_limit
    [identity_count, max_limit]
  end

  def logger
    # we 'borrow' the codec's logger as we don't have our own
    @base_codec.logger
  end

  def codec_without_usage_update(identity)
    find_codec_value(identity).codec
  end

  def eviction_timestamp_for(identity)
    find_codec_value(identity).eviction_timeout
  end

  private

  def stream_codec(identity)
    return base_codec if identity.nil?
    record_codec_usage(identity) # returns codec
  end

  def find_codec_value(identity)
    identity_map[identity]
  end

  # for nil stream this method is not called
  def record_codec_usage(identity)
    check_map_limits
    # only start the cleaner if streams are in use
    # continuous calls to start are OK
    cleaner.start
    auto_flusher.start
    compo = find_codec_value(identity)
    now = Time.now
    compo.eviction_timeout = eviction_timestamp(now)
    compo.auto_flush_timeout = auto_flush_timestamp(now)
    compo.codec
  end

  def auto_flush_timestamp(now = Time.now)
    now.to_f + @auto_flush_interval.to_f
  end

  def eviction_timestamp(now = Time.now)
    now.to_i + @evict_timeout
  end

  def check_map_limits
    UpperLimitReached.visit(self)
    EightyPercentWarning.visit(self)
  end

  def codec_builder(hash, k)
    codec = hash.empty? ? @base_codec : @base_codec.clone
    codec.use_mapper_auto_flush if using_mapped_auto_flush?
    compo = CodecValue.new(codec).tap do |o|
      now = Time.now
      o.eviction_timeout = eviction_timestamp(now)
      o.auto_flush_timeout = auto_flush_timestamp(now)
    end
    hash.store(k, compo)
  end

  def no_streams?
    identity_map.empty?
  end

  def using_mapped_auto_flush?
    !@auto_flush_interval.nil?
  end
end end end
