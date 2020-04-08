class Treetop::Runtime::SyntaxNode
  def get_meta(key)
    @ast_metadata ||= {}
    return @ast_metadata[key] if @ast_metadata[key] 
    return self.parent.get_meta(key) if self.parent
    nil
  end
  
  def set_meta(key, value)
    @ast_metadata ||= {}
    @ast_metadata[key] = value
  end

  def compile
    return "" if elements.nil?
    return elements.collect(&:compile).reject(&:empty?).join("")
  end

  # Traverse the syntax tree recursively.
  # The order should respect the order of the configuration file as it is read
  # and written by humans (and the order in which it is parsed).
  def recurse(e, depth=0, &block)
    r = block.call(e, depth)
    e.elements.each { |e| recurse(e, depth + 1, &block) } if r && e.elements
    nil
  end

  def recursive_inject(results=[], &block)
    if !elements.nil?
      elements.each do |element|
        if block.call(element)
          results << element
        else
          element.recursive_inject(results, &block)
        end
      end
    end
    return results
  end

  # When Treetop parses the configuration file
  # it will generate a tree, the generated tree will contain
  # a few `Empty` nodes to represent the actual space/tab or newline in the file.
  # Some of theses node will point to our concrete class.
  # To fetch a specific types of object we need to follow each branch
  # and ignore the empty nodes.
  def recursive_select(*klasses)
    return recursive_inject { |e| klasses.any? {|k| e.is_a?(k)} }
  end  

  def recursive_inject_parent(results=[], &block)
    if !parent.nil?
      if block.call(parent)
        results << parent
      else
        parent.recursive_inject_parent(results, &block)
      end
    end
    return results
  end

  def recursive_select_parent(results=[], klass)
    return recursive_inject_parent(results) { |e| e.is_a?(klass) }
  end
  
  # Monkeypatch Treetop::Runtime::SyntaxNode's inspect method to skip
  # any Whitespace or SyntaxNodes with no children.
  def _inspect(indent="")
    em = extension_modules
    interesting_methods = methods-[em.last ? em.last.methods : nil]-self.class.instance_methods
    im = interesting_methods.size > 0 ? " (#{interesting_methods.join(",")})" : ""
    tv = text_value
    tv = "...#{tv[-20..-1]}" if tv.size > 20

    indent +
    self.class.to_s.sub(/.*:/,'') +
      em.map{|m| "+"+m.to_s.sub(/.*:/,'')}*"" +
      " offset=#{interval.first}" +
      ", #{tv.inspect}" +
      im +
      (elements && elements.size > 0 ?
        ":" +
          (elements.select { |e| !e.is_a?(LogStash::Config::AST::Whitespace) && e.elements && e.elements.size > 0 }||[]).map{|e|
      begin
        "\n"+e.inspect(indent+"  ")
      rescue  # Defend against inspect not taking a parameter
        "\n"+indent+" "+e.inspect
      end
          }.join("") :
        ""
      )
  end
end
