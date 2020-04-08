require File.join(File.dirname(__FILE__), "namespace")

class RPM::Requires
  private
  def initialize(name)
    @name = name
    @version = "0"
    @operator = ">="
  end # def initialize

  def condition(operator, version)
    @operator = operator
    @version = version
  end # def condition

  def <=(version); condition(:<=, version) end
  def >=(version); condition(:>=, version) end
  def <(version); condition(:<, version) end
  def >(version); condition(:>, version) end
  def ==(version); condition(:==, version) end

  public(:initialize, :<=, :>=, :<, :>, :==)
end
