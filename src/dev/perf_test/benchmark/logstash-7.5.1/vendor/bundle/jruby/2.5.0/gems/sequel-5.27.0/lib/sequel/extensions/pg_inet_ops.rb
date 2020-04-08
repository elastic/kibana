# frozen-string-literal: true
#
# The pg_inet_ops extension adds support to Sequel's DSL to make
# it easier to call PostgreSQL inet functions and operators.
#
# To load the extension:
#
#   Sequel.extension :pg_inet_ops
#
# The most common usage is passing an expression to Sequel.pg_inet_op:
#
#   r = Sequel.pg_inet_op(:inet)
#
# Also, on most Sequel expression objects, you can call the pg_inet
# method:
#
#   r = Sequel[:ip].pg_inet
#
# If you have loaded the {core_extensions extension}[rdoc-ref:doc/core_extensions.rdoc],
# or you have loaded the core_refinements extension
# and have activated refinements for the file, you can also use Symbol#pg_inet:
#
#   r = :inet.pg_inet
#
# This creates a Sequel::Postgres::InetOp object that can be used
# for easier querying:
#
#   ~r                                 # ~inet
#   r & other                          # inet & other
#   r | other                          # inet | other
#   r << :other                        # inet << other
#   r >> :other                        # inet >> other
#
#   r.contained_by(:other)             # inet << other
#   r.contained_by_or_equals(:other)   # inet <<= other
#   r.contains(:other)                 # inet >> other
#   r.contains_or_equals(:other)       # inet >>= other
#   r.contains_or_contained_by(:other) # inet && other
#
#   r.abbrev           # abbrev(inet)
#   r.broadcast        # broadcast(inet)
#   r.family           # family(inet)
#   r.host             # host(inet)
#   r.hostmask         # hostmask(inet)
#   r.masklen          # masklen(inet)
#   r.netmask          # netmask(inet)
#   r.network          # network(inet)
#   r.set_masklen(16)  # set_masklen(inet, 16)
#   r.text             # text(inet)
#
# If a String or IPAddr instance is passed to Sequel.pg_inet_op, it will automatically
# be cast to +inet+.  To treat the object as a +cidr+, you must cast it before passing
# it to Sequel.pg_inet_op:
#
#   r = Sequel.pg_inet_op(Sequel.cast('1.2.3.4', :cidr))
#
# See the PostgreSQL network function and operator documentation for more
# details on what these functions and operators do.
#
# Related module: Sequel::Postgres::InetOp

require 'ipaddr'

module Sequel
  module Postgres
    # The InetOp class is a simple container for a single object that
    # defines methods that yield Sequel expression objects representing
    # PostgreSQL inet operators and functions.
    #
    # Most methods in this class are defined via metaprogramming, see
    # the pg_inet_ops extension documentation for details on the API.
    class InetOp < Sequel::SQL::Wrapper
      include Sequel::SQL::BitwiseMethods

      # For String and IPAddr instances, wrap them in a cast to inet,
      # to avoid ambiguity issues when calling operator methods.
      def initialize(v)
        case v
        when ::Sequel::LiteralString
          # nothing
        when String, IPAddr
          v = Sequel.cast(v, :inet)
        end
        super
      end

      OPERATORS = {
        :contained_by_or_equals => ["(".freeze, " <<= ".freeze, ")".freeze].freeze,
        :contains_or_equals => ["(".freeze, " >>= ".freeze, ")".freeze].freeze,
        :contains_or_contained_by => ["(".freeze, " && ".freeze, ")".freeze].freeze,
      }.freeze

      OPERATORS.keys.each do |f|
        class_eval("def #{f}(v) Sequel::SQL::BooleanExpression.new(:NOOP, operator(:#{f}, v)) end", __FILE__, __LINE__)
      end

      %w'<< >>'.each do |f|
        class_eval("def #{f}(v) Sequel::SQL::BooleanExpression.new(:NOOP, super) end", __FILE__, __LINE__)
      end

      %w'& | +'.each do |f|
        class_eval("def #{f}(v) self.class.new(super) end", __FILE__, __LINE__)
      end

      %w'abbrev host text'.each do |f|
        class_eval("def #{f}() Sequel::SQL::StringExpression.new(:NOOP, function(:#{f})) end", __FILE__, __LINE__)
      end

      %w'family masklen'.each do |f|
        class_eval("def #{f}() Sequel::SQL::NumericExpression.new(:NOOP, function(:#{f})) end", __FILE__, __LINE__)
      end

      %w'broadcast hostmask netmask network'.each do |f|
        class_eval("def #{f}() self.class.new(function(:#{f})) end", __FILE__, __LINE__)
      end

      # Return the receiver.
      def pg_inet
        self
      end

      # Return an expression for the bitwise NOT of the receiver 
      def ~
        self.class.new(super)
      end

      # Return an expression for the subtraction of the argument from the receiver
      def -(v)
        case v
        when Integer
          self.class.new(super)
        else
          Sequel::SQL::NumericExpression.new(:NOOP, super)
        end
      end

      # Return an expression for the calling of the set_masklen function with the receiver and the given argument
      def set_masklen(v)
        self.class.new(Sequel::SQL::Function.new(:set_masklen, self, v))
      end

      alias contained_by <<
      alias contains >> 

      undef_method :*, :/

      private

      # Handle PostgreSQL specific operator types
      def operator(type, other)
        Sequel::SQL::PlaceholderLiteralString.new(OPERATORS[type], [value, other])
      end

      # Return a function called with the receiver.
      def function(name)
        Sequel::SQL::Function.new(name, self)
      end
    end

    module InetOpMethods
      # Wrap the receiver in an InetOp so you can easily use the PostgreSQL
      # inet functions and operators with it.
      def pg_inet
        InetOp.new(self)
      end
    end
  end

  module SQL::Builders
    # Return the expression wrapped in the Postgres::InetOp.
    def pg_inet_op(v)
      case v
      when Postgres::InetOp
        v
      else
        Postgres::InetOp.new(v)
      end
    end
  end

  class SQL::GenericExpression
    include Sequel::Postgres::InetOpMethods
  end

  class LiteralString
    include Sequel::Postgres::InetOpMethods
  end
end

# :nocov:
if Sequel.core_extensions?
  class Symbol
    include Sequel::Postgres::InetOpMethods
  end
end

if defined?(Sequel::CoreRefinements)
  module Sequel::CoreRefinements
    refine Symbol do
      include Sequel::Postgres::InetOpMethods
    end
  end
end
# :nocov:
