require 'coverage'
require 'simplecov'

def SimpleCov.sequel_coverage(opts = {})
  start do
    add_filter "/spec/"
    add_group('Missing-Revelent'){|src| src.filename =~ opts[:group] && src.covered_percent < 100} if opts[:group]
    add_group('Missing'){|src| src.covered_percent < 100}
    add_group('Covered'){|src| src.covered_percent == 100}
    add_filter{|src| src.filename !~ opts[:filter]} if opts[:filter]
    yield self if block_given?
  end
end

ENV.delete('COVERAGE')
