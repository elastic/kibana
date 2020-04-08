unless Method.method_defined?(:<<) || Method.method_defined?(:>>)
  require 'backports/2.6.0/proc/compose'

  class Method
    def <<(g)
      to_proc << g
    end

    def >>(g)
      to_proc >> g
    end
  end
end
