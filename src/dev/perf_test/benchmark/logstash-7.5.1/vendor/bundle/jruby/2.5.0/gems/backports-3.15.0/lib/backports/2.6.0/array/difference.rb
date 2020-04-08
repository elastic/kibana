class Array
  def difference(*arrays)
    arrays.inject(Array.new(self), :-)
  end unless method_defined? :difference
end
