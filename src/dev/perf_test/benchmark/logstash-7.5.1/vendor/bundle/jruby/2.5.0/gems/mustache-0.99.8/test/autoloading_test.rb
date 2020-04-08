$LOAD_PATH.unshift File.dirname(__FILE__)
require 'helper'

module TestViews; end

class AutoloadingTest < Test::Unit::TestCase
  def setup
    Mustache.view_path = File.dirname(__FILE__) + '/fixtures'
  end

  def test_autoload
    klass = Mustache.view_class(:Comments)
    assert_equal Comments, klass
  end

  def test_autoload_lowercase
    klass = Mustache.view_class(:comments)
    assert_equal Comments, klass
  end

  def test_autoload_nil
    klass = Mustache.view_class(nil)
    assert_equal Mustache, klass
  end

  def test_autoload_empty_string
    klass = Mustache.view_class('')
    assert_equal Mustache, klass
  end

  def test_namespaced_autoload
    Mustache.view_namespace = TestViews
    klass = Mustache.view_class('Namespaced')
    assert_equal TestViews::Namespaced, klass
    assert_equal <<-end_render.strip, klass.render
<h1>Dragon &lt; Tiger</h1>
end_render
  end

  def test_folder_autoload
    assert_equal TestViews::Namespaced, Mustache.view_class('test_views/namespaced')
  end

  def test_namespaced_partial_autoload
    Mustache.view_namespace = TestViews
    klass = Mustache.view_class(:namespaced_with_partial)
    assert_equal TestViews::NamespacedWithPartial, klass
    assert_equal <<-end_render.strip, klass.render
My opinion: Again, Victory!
end_render
  end

  def test_bad_constant_name
    assert_equal Mustache, Mustache.view_class(404)
  end
end
