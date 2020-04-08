unless Proc.method_defined?(:<<) || Proc.method_defined?(:>>)
  class Proc
    def <<(g)
      if lambda?
        lambda { |*args, &blk| call(g.call(*args, &blk)) }
      else
        proc { |*args, &blk| call(g.call(*args, &blk)) }
      end
    end

    def >>(g)
      if lambda?
        lambda { |*args, &blk| g.call(call(*args, &blk)) }
      else
        proc { |*args, &blk| g.call(call(*args, &blk)) }
      end
    end
  end
end
