module Metriks::Reporter
  class ProcTitle
    def initialize(options = {})
      @rounding = options[:rounding] || 1
      @prefix   = options[:prefix]   || $0.dup

      @interval  = options[:interval] || 5
      @on_error  = options[:on_error] || proc { |ex| }

      @metrics  = []
    end

    def add(name, suffix = nil, &block)
      @metrics << [ name, suffix, block ]
    end

    def empty?
      @metrics.empty?
    end

    def start
      @thread ||= Thread.new do
        loop do
          begin
            unless @metrics.empty?
              title = generate_title
              if title && !title.empty?
                $0 = "#{@prefix} #{title}"
              end
            end
          rescue Exception => ex
            @on_error[ex] rescue nil
          end
          sleep @interval
        end
      end
    end

    def stop
      @thread.kill if @thread
      @thread = nil
    end

    def restart
      stop
      start
    end

    protected
    def generate_title
      @metrics.collect do |name, suffix, block|
        val = block.call
        val = "%.#{@rounding}f" % val if val.is_a?(Float)

        "#{name}: #{val}#{suffix}"
      end.join(' ')
    end
  end
end