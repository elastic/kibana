require "rubygems"                                                                                               
require "yard"                                                                                                   
require File.join(File.expand_path(File.dirname(__FILE__)), "testing")

describe "documentation tests" do
  before do
    # Use YARD to parse all ruby files found in '../lib'
    libdir = File.join(File.dirname(__FILE__), "..", "lib")
    YARD::Registry.load(Dir.glob(File.join(libdir, "**", "*.rb")))
    @registry = YARD::Registry.all
  end

  test "All classes, methods, modules, and constants must be documented" do
    # YARD's parser works best in ruby 1.9.x, so skip 1.8.x
    skip if RUBY_VERSION < "1.9.2"
    # Note, the 'find the undocumented things' code here is 
    # copied mostly from: YARD 0.7.5's lib/yard/cli/stats.rb
    #
    # Find all undocumented classes, modules, and constants
    undocumented = @registry.select do |o| 
      [:class, :module, :constant].include?(o.type) && o.docstring.blank?
    end

    # Find all undocumented methods
    methods = @registry.select { |m| m.type == :method }
    methods.reject! { |m| m.is_alias? || !m.is_explicit? }
    undocumented += methods.select do |m| 
      m.docstring.blank? && !m.overridden_method
    end

    if (undocumented.length > 0)
      message = ["The following are not documented"]
      undocumented.each do |o|
        message << "* #{o.type.to_s} #{o.to_s} <#{o.file}:#{o.line}>"
      end

      flunk(message.join("\n"))
    else
      pass
    end
  end
end
