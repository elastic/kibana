require 'cgi'

require 'mustache/parser'
require 'mustache/generator'

class Mustache
  # A Template represents a Mustache template. It compiles and caches
  # a raw string template into something usable.
  #
  # The idea is this: when handed a Mustache template, convert it into
  # a Ruby string by transforming Mustache tags into interpolated
  # Ruby.
  #
  # You shouldn't use this class directly, instead:
  #
  # >> Mustache.render(template, hash)
  class Template
    attr_reader :source

    # Expects a Mustache template as a string along with a template
    # path, which it uses to find partials.
    def initialize(source)
      @source = source
    end

    # Renders the `@source` Mustache template using the given
    # `context`, which should be a simple hash keyed with symbols.
    #
    # The first time a template is rendered, this method is overriden
    # and from then on it is "compiled". Subsequent calls will skip
    # the compilation step and run the Ruby version of the template
    # directly.
    def render(context)
      # Compile our Mustache template into a Ruby string
      compiled = "def render(ctx) #{compile} end"

      # Here we rewrite ourself with the interpolated Ruby version of
      # our Mustache template so subsequent calls are very fast and
      # can skip the compilation stage.
      instance_eval(compiled, __FILE__, __LINE__ - 1)

      # Call the newly rewritten version of #render
      render(context)
    end

    # Does the dirty work of transforming a Mustache template into an
    # interpolation-friendly Ruby string.
    def compile(src = @source)
      Generator.new.compile(tokens(src))
    end
    alias_method :to_s, :compile

    # Returns an array of tokens for a given template.
    def tokens(src = @source)
      Parser.new.compile(src)
    end

    # Simple recursive iterator for tokens
    def self.recursor(toks, section, &block)
      toks.map do |token|
        next unless token.is_a? Array

        if token[0] == :mustache
          new_token, new_section, result, stop = yield(token, section)
          [ result ] + ( stop ? [] : recursor(new_token, new_section, &block))
        else
          recursor(token, section, &block)
        end
      end
    end

    # Returns an array of tags
    # Tags that belong to sections will be of the form `section1.tag`
    def tags
      Template.recursor(tokens, []) do |token, section|
        if [:etag, :utag].include?(token[1])
          [ new_token=nil, new_section=nil, result=((section + [token[2][2][0]]).join('.')), stop=true ]
        elsif [:section, :inverted_section].include?(token[1])
          [ new_token=token[4], new_section=(section + [token[2][2][0]]), result=nil, stop=false ]
        else
          [ new_token=token, new_section=section, result=nil, stop=false ]
        end
      end.flatten.reject(&:nil?).uniq
    end

    # Returns an array of sections
    # Sections that belong to other sections will be of the form `section1.childsection`
    def sections
      Template.recursor(tokens, []) do |token, section|
        if [:section, :inverted_section].include?(token[1])
          new_section=(section + [token[2][2][0]])
          [ new_token=token[4], new_section, result=new_section.join('.'), stop=false ]
        else
          [ new_token=token, new_section=section, result=nil, stop=false ]
        end
      end.flatten.reject(&:nil?).uniq
    end

    # Returns an array of partials
    # Partials that belong to sections are included, but the section name is not preserved
    def partials
      Template.recursor(tokens, []) do |token, section|
        if token[1] == :partial
          [ new_token=token, new_section=section, result=token[2], stop=true ]
        else
          [ new_token=token, new_section=section, result=nil, stop=false ]
        end
      end.flatten.reject(&:nil?).uniq
    end
  end
end
