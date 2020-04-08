require "grok-pure"

class Grok::Match
  attr_accessor :subject
  attr_accessor :grok
  attr_accessor :match

  public
  def initialize
    @captures = nil
  end

  public
  def each_capture(&block)
    @grok.capture(@match, &block)
  end # def each_capture

  public
  def captures
    if @captures.nil?
      @captures = Hash.new { |h,k| h[k] = [] }
      each_capture do |key, val|
        @captures[key] << val
      end
    end
    return @captures
  end # def captures

  public
  def [](name)
    return captures[name]
  end # def []
end # Grok::Match
