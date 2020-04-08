$LOAD_PATH.unshift File.dirname(__FILE__)
require 'helper'

class ParserTest < Test::Unit::TestCase

  def test_parser_extension
    parser = Mustache::Parser.new
    parser.instance_variable_set :@result, 'zomg'
    Mustache::Parser.add_type(:'@', :'$') do |*args|
      [:mustache, :at_sign, @result, *args]
    end
    assert_match Mustache::Parser.valid_types, '@'
    assert_match Mustache::Parser.valid_types, '$'
    assert_equal [:mustache, :at_sign, 'zomg', 1, 2, 3],
                 parser.send('scan_tag_@', 1, 2, 3)
    assert_equal [:mustache, :at_sign, 'zomg', 1, 2, 3],
                 parser.send('scan_tag_$', 1, 2, 3)
  end

  def test_parser
    lexer = Mustache::Parser.new
    tokens = lexer.compile(<<-EOF)
<h1>{{header}}</h1>
{{#items}}
{{#first}}
  <li><strong>{{name}}</strong></li>
{{/first}}
{{#link}}
  <li><a href="{{url}}">{{name}}</a></li>
{{/link}}
{{/items}}

{{#empty}}
<p>The list is empty.</p>
{{/empty}}
EOF

    expected = [:multi,
      [:static, "<h1>"],
      [:mustache, :etag, [:mustache, :fetch, ["header"]], [1, 11]],
      [:static, "</h1>\n"],
      [:mustache,
        :section,
        [:mustache, :fetch, ["items"]],
        [2, 7],
        [:multi,
          [:mustache,
            :section,
            [:mustache, :fetch, ["first"]],
            [3, 7],
            [:multi,
              [:static, "  <li><strong>"],
              [:mustache, :etag, [:mustache, :fetch, ["name"]], [4, 19]],
              [:static, "</strong></li>\n"]],
            %Q'  <li><strong>{{name}}</strong></li>\n',
            %w[{{ }}]],
          [:mustache,
            :section,
            [:mustache, :fetch, ["link"]],
            [6, 6],
            [:multi,
              [:static, "  <li><a href=\""],
              [:mustache, :etag, [:mustache, :fetch, ["url"]], [7, 19]],
              [:static, "\">"],
              [:mustache, :etag, [:mustache, :fetch, ["name"]], [7, 29]],
              [:static, "</a></li>\n"]],
            %Q'  <li><a href="{{url}}">{{name}}</a></li>\n',
            %w[{{ }}]]],
        %Q'{{#first}}\n  <li><strong>{{name}}</strong></li>\n{{/first}}\n{{#link}}\n  <li><a href="{{url}}">{{name}}</a></li>\n{{/link}}\n',
        %w[{{ }}]],
      [:static, "\n"],
      [:mustache,
        :section,
        [:mustache, :fetch, ["empty"]],
        [11, 7],
        [:multi, [:static, "<p>The list is empty.</p>\n"]],
        %Q'<p>The list is empty.</p>\n',
        %w[{{ }}]]]

    assert_equal expected, tokens
  end

  def test_raw_content_and_whitespace
    lexer = Mustache::Parser.new
    tokens = lexer.compile("{{#list}}\t{{/list}}")

    expected = [:multi,
      [:mustache,
        :section,
        [:mustache, :fetch, ["list"]],
        [1, 6],
        [:multi, [:static, "\t"]],
        "\t",
        %w[{{ }}]]]

    assert_equal expected, tokens
  end
end
