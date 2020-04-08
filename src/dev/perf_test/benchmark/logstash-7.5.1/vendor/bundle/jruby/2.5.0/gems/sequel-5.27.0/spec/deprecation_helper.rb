Sequel::Deprecation.backtrace_filter = lambda{|line, lineno| lineno < 4 || line =~ /_spec\.rb/}

class Minitest::HooksSpec
  def self.deprecated(a, &block)
    it("#{a} (deprecated)") do
      deprecated{instance_exec(&block)}
    end
  end

  def deprecated
    output = Sequel::Deprecation.output
    Sequel::Deprecation.output = nil
    yield
  ensure
    Sequel::Deprecation.output = output
  end

  def self.with_symbol_splitting(a, &block)
    it("#{a}, with symbol splitting enabled") do
      with_symbol_splitting{instance_exec(&block)}
    end
  end

  def with_symbol_splitting
    Sequel.split_symbols = true
    yield
  ensure
    Sequel.split_symbols = false
  end
end
