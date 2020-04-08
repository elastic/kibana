require 'rspec'
require 'edn'
require 'rantly'
require 'date'
require 'time'

REPEAT = (ENV["REPEAT"] || 150).to_i

RSpec.configure do |c|
  c.fail_fast = true
  c.filter_run_including :focused => true
  c.alias_example_to :fit, :focused => true
  c.treat_symbols_as_metadata_keys_with_true_values = true
  c.run_all_when_everything_filtered = true

  c.filter_run :focus
  c.run_all_when_everything_filtered = true
end

def io_for(s)
  StringIO.new(s)
end

module RantlyHelpers

  KEYWORD = lambda { |_|
    call(SYMBOL).to_sym.to_edn
  }

  SYMBOL = lambda { |_|
    branch(PLAIN_SYMBOL, NAMESPACED_SYMBOL)
  }

  PLAIN_SYMBOL = lambda { |_|
    sized(range(1, 100)) {
      s = string(/[[:alnum:]]|[\.\*\+\!\-\?\$_%<>&=:#]/)
      guard s !~ /^[0-9]/
      guard s !~ /^[\+\-\.][0-9]/
      guard s !~ /^[\:\#]/
      s
    }
  }

  NAMESPACED_SYMBOL = lambda { |_|
    [call(PLAIN_SYMBOL), call(PLAIN_SYMBOL)].join("/")
  }

  INTEGER = lambda { |_| integer.to_edn }

  STRING = lambda { |_| sized(range(1, 100)) { string.to_edn } }

  RUBY_STRING = lambda { |_| sized(range(1, 100)) { string } }

  FLOAT = lambda { |_| (float * range(-4000, 5000)).to_edn }

  FLOAT_WITH_EXP = lambda { |_|
    # limited range because of Infinity
    f = float.to_s
    guard f !~ /[Ee]/

    [f, choose("e", "E", "e+", "E+", "e-", "e+"), range(1, 100)].
    map(&:to_s).
    join("")
  }

  RUBY_CHAR = lambda { |_|
    "\\" +
    sized(1) {
      freq([1, [:choose, "\n", "\r", " ", "\t"]],
           [5, [:string, :graph]])
    }
  }

  CHARACTER = lambda { |_|
    "\\" +
    sized(1) {
      freq([1, [:choose, "newline", "return", "space", "tab"]],
           [5, [:string, :graph]])
    }
  }

  BOOL_OR_NIL = lambda { |_|
    choose("true", "false", "nil")
  }

  ARRAY = lambda { |_|
    array(range(1, 10)) { call(ELEMENT) }
  }

  VECTOR = lambda { |_|
    '[' + call(ARRAY).join(', ') + ']'
  }

  LIST = lambda { |_|
    '(' + call(ARRAY).join(', ') + ')'
  }

  SET = lambda { |_|
    '#{' + call(ARRAY).join(', ') + '}'
  }

  MAP = lambda { |_|
    size = range(0, 10)
    keys = array(size) { call(ELEMENT) }
    elements = array(size) { call(ELEMENT) }
    arrays = keys.zip(elements)
    '{' + arrays.map { |array| array.join(" ") }.join(", ") + '}'
  }

  ELEMENT = lambda { |_|
    freq([8, BASIC_ELEMENT],
         [2, ELEMENT_WITH_METADATA],
         [1, INST],
         [1, TAGGED_ELEMENT])
  }

  BASIC_ELEMENT = lambda { |_|
    branch(INTEGER,
           FLOAT,
           FLOAT_WITH_EXP,
           STRING,
           KEYWORD,
           SYMBOL,
           CHARACTER,
           BOOL_OR_NIL,
           VECTOR,
           LIST,
           SET,
           MAP)
  }

  METADATA = lambda { |_|
    size = range(1, 4)
    keys = array(size) { branch(KEYWORD, SYMBOL, STRING) }
    elements = array(size) { call(ELEMENT) }
    arrays = keys.zip(elements)
    '^{' + arrays.map { |array| array.join(" ") }.join(", ") + '}'
  }

  ELEMENT_WITH_METADATA = lambda { |_|
    [call(METADATA), branch(SYMBOL, VECTOR, LIST, SET, MAP)].join(" ")
  }

  TAG = lambda { |_|
    tag = call(SYMBOL)
    guard tag =~ /^[A-Za-z]/
    "##{tag}"
  }

  TAGGED_ELEMENT = lambda { |_|
    [call(TAG), call(BASIC_ELEMENT)].join(" ")
  }

  INST = lambda { |_|
    begin
      DateTime.new(range(0, 2500), range(1, 12), range(1, 28), range(0, 23), range(0, 59), range(0, 59), "#{range(-12,12)}").to_edn
    rescue ArgumentError
      guard false
    end
  }

  def rant(fun, count = REPEAT)
    Rantly(count) { call(fun) }
  end
end
