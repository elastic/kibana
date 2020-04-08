module ObjectSpace
  def count_symbols
    JRuby.runtime.symbol_table.size
  end
  module_function :count_symbols

  def internal_class_of(object)
    JRuby.reference(object).meta_class
  end
  module_function :internal_class_of

  def internal_super_of(cls)
    raise ArgumentError, "class or module expected" unless cls.kind_of? Module
    JRuby.reference(cls).super_class
  end
  module_function :internal_super_of
end