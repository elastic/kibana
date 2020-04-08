# encoding: utf-8

module LogStash
  class PipelineState
    attr_reader :pipeline_id, :pipeline

    def initialize(pipeline_id, pipeline)
      @pipeline_id = pipeline_id
      @pipeline = pipeline
      @reloading = Concurrent::AtomicBoolean.new(false)
    end

    def terminated?
      # a reloading pipeline is never considered terminated
      @reloading.false? && @pipeline.finished_execution?
    end

    def set_reloading(is_reloading)
      @reloading.value = is_reloading
    end

    def set_pipeline(pipeline)
      raise(ArgumentError, "invalid nil pipeline") if pipeline.nil?
      @pipeline = pipeline
    end
  end

  class PipelinesRegistry
    attr_reader :states
    include LogStash::Util::Loggable

    def initialize
      # we leverage the semantic of the Java ConcurrentHashMap for the
      # compute() method which is atomic; calling compute() concurrently
      # will block until the other compute finishes so no mutex is necessary
      # for synchronizing compute calls
      @states = java.util.concurrent.ConcurrentHashMap.new
      @locks = java.util.concurrent.ConcurrentHashMap.new
    end

    # Execute the passed creation logic block and create a new state upon success
    # @param pipeline_id [String, Symbol] the pipeline id
    # @param pipeline [Pipeline] the new pipeline to create
    # @param create_block [Block] the creation execution logic
    #
    # @yieldreturn [Boolean] the new pipeline creation success
    #
    # @return [Boolean] new pipeline creation success
    def create_pipeline(pipeline_id, pipeline, &create_block)
      lock = get_lock(pipeline_id)
      lock.lock

      success = false

      state = @states.get(pipeline_id)
      if state
        if state.terminated?
          success = yield
          state.set_pipeline(pipeline)
        else
          logger.error("Attempted to create a pipeline that already exists", :pipeline_id => pipeline_id)
        end
        @states.put(pipeline_id, state)
      else
        success = yield
        @states.put(pipeline_id, PipelineState.new(pipeline_id, pipeline)) if success
      end

      success
    ensure
      lock.unlock
    end

    # Execute the passed termination logic block
    # @param pipeline_id [String, Symbol] the pipeline id
    # @param stop_block [Block] the termination execution logic
    #
    # @yieldparam [Pipeline] the pipeline to terminate
    def terminate_pipeline(pipeline_id, &stop_block)
      lock = get_lock(pipeline_id)
      lock.lock

      state = @states.get(pipeline_id)
      if state.nil?
        logger.error("Attempted to terminate a pipeline that does not exists", :pipeline_id => pipeline_id)
        @states.remove(pipeline_id)
      else
        yield(state.pipeline)
        @states.put(pipeline_id, state)
      end
    ensure
      lock.unlock
    end

    # Execute the passed reloading logic block in the context of the reloading state and set new pipeline in state
    # @param pipeline_id [String, Symbol] the pipeline id
    # @param reload_block [Block] the reloading execution logic
    #
    # @yieldreturn [Array<Boolean, Pipeline>] the new pipeline creation success and new pipeline object
    #
    # @return [Boolean] new pipeline creation success
    def reload_pipeline(pipeline_id, &reload_block)
      lock = get_lock(pipeline_id)
      lock.lock
      success = false

      state = @states.get(pipeline_id)
      if state.nil?
        logger.error("Attempted to reload a pipeline that does not exists", :pipeline_id => pipeline_id)
        @states.remove(pipeline_id)
      else
        state.set_reloading(true)
        begin
          success, new_pipeline = yield
          state.set_pipeline(new_pipeline)
        ensure
          state.set_reloading(false)
        end
        @states.put(pipeline_id, state)
      end

    success
    ensure
      lock.unlock
    end

    # @param pipeline_id [String, Symbol] the pipeline id
    # @return [Pipeline] the pipeline object or nil if none for pipeline_id
    def get_pipeline(pipeline_id)
      state = @states.get(pipeline_id)
      state.nil? ? nil : state.pipeline
    end

    # @return [Fixnum] number of items in the states collection
    def size
      @states.size
    end

    # @return [Boolean] true if the states collection is empty.
    def empty?
      @states.isEmpty
    end

    # @return [Hash{String=>Pipeline}]
    def running_pipelines
      select_pipelines { |state| !state.terminated? }
    end

    # @return [Hash{String=>Pipeline}]
    def non_running_pipelines
      select_pipelines { |state| state.terminated? }
    end

    # @return [Hash{String=>Pipeline}]
    def running_user_defined_pipelines
      select_pipelines { |state | !state.terminated? && !state.pipeline.system? }
    end

    private

    # Returns a mapping of pipelines by their ids.
    # Pipelines can optionally be filtered by their `PipelineState` by passing
    # a block that returns truthy when a pipeline should be included in the
    # result.
    #
    # @yieldparam [PipelineState]
    # @yieldreturn [Boolean]
    #
    # @return [Hash{String=>Pipeline}]
    def select_pipelines(&optional_state_filter)
      @states.each_with_object({}) do |(id, state), memo|
        if state && (!block_given? || yield(state))
          memo[id] = state.pipeline
        end
      end
    end

    def get_lock(pipeline_id)
      @locks.compute_if_absent(pipeline_id) do |k|
        java.util.concurrent.locks.ReentrantLock.new
      end
    end
  end
end
