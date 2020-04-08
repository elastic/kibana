$LOAD_PATH.unshift File.dirname(__FILE__)
require 'helper'

class PartialTest < Test::Unit::TestCase
  def test_view_partial
    assert_equal <<-end_partial.strip, PartialWithModule.render
<h1>Welcome</h1>
Hello Bob
You have just won $100000!

<h3>Fair enough, right?</h3>
end_partial
  end

  def test_partial_with_slashes
    klass = Class.new(Mustache)
    klass.template = '{{> test/fixtures/inner_partial}}'
    view = klass.new
    view[:title] = 'success'

    assert_equal "Again, success!", view.render
  end

  def test_view_partial_inherits_context
    klass = Class.new(TemplatePartial)
    view = klass.new
    view.template_path = File.dirname(__FILE__) + '/fixtures'
    view[:titles] = [{:title => :One}, {:title => :Two}]
    view.template = <<-end_template
<h1>Context Test</h1>
<ul>
{{#titles}}
<li>{{>inner_partial}}</li>
{{/titles}}
</ul>
end_template
    assert_equal <<-end_partial, view.render
<h1>Context Test</h1>
<ul>
<li>Again, One!</li>
<li>Again, Two!</li>
</ul>
end_partial
  end

  def test_view_partial_inherits_context_of_class_methods
    klass = Class.new(TemplatePartial)
    klass.template_path = File.dirname(__FILE__) + '/fixtures'
    klass.send(:define_method, :titles) do
      [{:title => :One}, {:title => :Two}]
    end
    view = klass.new
    view.template = <<-end_template
<h1>Context Test</h1>
<ul>
{{#titles}}
<li>{{>inner_partial}}</li>
{{/titles}}
</ul>
end_template
    assert_equal <<-end_partial, view.render
<h1>Context Test</h1>
<ul>
<li>Again, One!</li>
<li>Again, Two!</li>
</ul>
end_partial
  end

  def test_template_partial
    assert_equal <<-end_partial.strip, TemplatePartial.render
<h1>Welcome</h1>
Again, Welcome!
end_partial
  end

  def test_template_partial_with_custom_extension
    partial = Class.new(TemplatePartial)
    partial.template_extension = 'txt'
    partial.template_path = File.dirname(__FILE__) + '/fixtures'

    assert_equal <<-end_partial.strip, partial.render.strip
Welcome
-------

## Again, Welcome! ##
end_partial
  end

  def test_recursive_partials
    assert_equal <<-end_partial, Recursive.render
It works!
end_partial
  end

  def test_crazy_recursive_partials
    assert_equal <<-end_partial.strip, CrazyRecursive.render
<html>
  <body>
    <ul>
      <li>
        1
        <ul>
          <li>
            2
            <ul>
              <li>
                3
                <ul>
                </ul>
              </li>
            </ul>
          </li>
          <li>
            4
            <ul>
              <li>
                5
                <ul>
                  <li>
                    6
                    <ul>
                    </ul>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
        </ul>
      </li>
    </ul>
  </body>
</html>
end_partial
  end

  def test_partials_use_proper_context
    assert_equal "OuterThing OuterThing", OuterThing.render('{{name}} {{> p}}')

    assert_equal "InnerThing InnerThing", InnerThing.render('{{name}} {{> p}}')

    assert_equal "OuterThing InnerThing InnerThing",
      OuterThing.render('{{name}} {{#inner}}{{name}} {{> p}}{{/inner}}')
  end

  def test_partials_render_returned_strings
    assert_equal "ok", MiddleThing.render('{{> some_partial }}')
  end
end

class InnerThing < Mustache
  def partial(p) self.class end
  def name;      self.class end
end

class OuterThing < Mustache
  def inner
    InnerThing.new
  end

  def partial(p) self.class end
  def name;      self.class end
end

class MiddleThing < Mustache
  def partial(name) "{{#{name}}}" end
  def some_partial; "ok" end
end
