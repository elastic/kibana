class Mustache
  # The Generator is in charge of taking an array of Mustache tokens,
  # usually assembled by the Parser, and generating an interpolatable
  # Ruby string. This string is considered the "compiled" template
  # because at that point we're relying on Ruby to do the parsing and
  # run our code.
  #
  # For example, let's take this template:
  #
  #   Hi {{thing}}!
  #
  # If we run this through the Parser we'll get these tokens:
  #
  #   [:multi,
  #     [:static, "Hi "],
  #     [:mustache, :etag, "thing"],
  #     [:static, "!\n"]]
  #
  # Now let's hand that to the Generator:
  #
  # >> puts Mustache::Generator.new.compile(tokens)
  # "Hi #{CGI.escapeHTML(ctx[:thing].to_s)}!\n"
  #
  # You can see the generated Ruby string for any template with the
  # mustache(1) command line tool:
  #
  #   $ mustache --compile test.mustache
  #   "Hi #{CGI.escapeHTML(ctx[:thing].to_s)}!\n"
  class Generator
    # Options are unused for now but may become useful in the future.
    def initialize(options = {})
      @options = options
    end

    # Given an array of tokens, returns an interpolatable Ruby string.
    def compile(exp)
      "\"#{compile!(exp)}\""
    end

    # Given an array of tokens, converts them into Ruby code. In
    # particular there are three types of expressions we are concerned
    # with:
    #
    #   :multi
    #     Mixed bag of :static, :mustache, and whatever.
    #
    #   :static
    #     Normal HTML, the stuff outside of {{mustaches}}.
    #
    #   :mustache
    #     Any Mustache tag, from sections to partials.
    #
    # To give you an idea of what you'll be dealing with take this
    # template:
    #
    #   Hello {{name}}
    #   You have just won ${{value}}!
    #   {{#in_ca}}
    #   Well, ${{taxed_value}}, after taxes.
    #   {{/in_ca}}
    #
    # If we run this through the Parser, we'll get back this array of
    # tokens:
    #
    #   [:multi,
    #    [:static, "Hello "],
    #    [:mustache, :etag,
    #     [:mustache, :fetch, ["name"]]],
    #    [:static, "\nYou have just won $"],
    #   [:mustache, :etag,
    #    [:mustache, :fetch, ["value"]]],
    #   [:static, "!\n"],
    #   [:mustache,
    #    :section,
    #    [:mustache, :fetch, ["in_ca"]],
    #   [:multi,
    #    [:static, "Well, $"],
    #    [:mustache, :etag,
    #     [:mustache, :fetch, ["taxed_value"]]],
    #    [:static, ", after taxes.\n"]],
    #    "Well, ${{taxed_value}}, after taxes.\n",
    #    ["{{", "}}"]]]
    def compile!(exp)
      case exp.first
      when :multi
        exp[1..-1].map { |e| compile!(e) }.join
      when :static
        str(exp[1])
      when :mustache
        send("on_#{exp[1]}", *exp[2..-1])
      else
        raise "Unhandled exp: #{exp.first}"
      end
    end

    # Callback fired when the compiler finds a section token. We're
    # passed the section name and the array of tokens.
    def on_section(name, offset, content, raw, delims)
      # Convert the tokenized content of this section into a Ruby
      # string we can use.
      code = compile(content)

      # Compile the Ruby for this section now that we know what's
      # inside the section.
      ev(<<-compiled)
      if v = #{compile!(name)}
        if v == true
          #{code}
        elsif v.is_a?(Proc)
          t = Mustache::Template.new(v.call(#{raw.inspect}).to_s)
          def t.tokens(src=@source)
            p = Parser.new
            p.otag, p.ctag = #{delims.inspect}
            p.compile(src)
          end
          t.render(ctx.dup)
        else
          # Shortcut when passed non-array
          v = [v] unless v.is_a?(Array) || v.is_a?(Mustache::Enumerable) || defined?(Enumerator) && v.is_a?(Enumerator)

          v.map { |h| ctx.push(h); r = #{code}; ctx.pop; r }.join
        end
      end
      compiled
    end

    # Fired when we find an inverted section. Just like `on_section`,
    # we're passed the inverted section name and the array of tokens.
    def on_inverted_section(name, offset, content, raw, delims)
      # Convert the tokenized content of this section into a Ruby
      # string we can use.
      code = compile(content)

      # Compile the Ruby for this inverted section now that we know
      # what's inside.
      ev(<<-compiled)
      v = #{compile!(name)}
      if v.nil? || v == false || v.respond_to?(:empty?) && v.empty?
        #{code}
      end
      compiled
    end

    # Fired when the compiler finds a partial. We want to return code
    # which calls a partial at runtime instead of expanding and
    # including the partial's body to allow for recursive partials.
    def on_partial(name, offset, indentation)
      ev("ctx.partial(#{name.to_sym.inspect}, #{indentation.inspect})")
    end

    # An unescaped tag.
    def on_utag(name, offset)
      ev(<<-compiled)
        v = #{compile!(name)}
        if v.is_a?(Proc)
          v = Mustache::Template.new(v.call.to_s).render(ctx.dup)
        end
        v.to_s
      compiled
    end

    # An escaped tag.
    def on_etag(name, offset)
      ev(<<-compiled)
        v = #{compile!(name)}
        if v.is_a?(Proc)
          v = Mustache::Template.new(v.call.to_s).render(ctx.dup)
        end
        ctx.escapeHTML(v.to_s)
      compiled
    end

    def on_fetch(names)
      return "ctx[:to_s]" if names.empty?

      names = names.map { |n| n.to_sym }

      initial, *rest = names
      <<-compiled
        #{rest.inspect}.reduce(ctx[#{initial.inspect}]) { |value, key|
          value && ctx.find(value, key)
        }
      compiled
    end

    # An interpolation-friendly version of a string, for use within a
    # Ruby string.
    def ev(s)
      "#\{#{s}}"
    end

    def str(s)
      s.inspect[1..-2]
    end
  end
end
