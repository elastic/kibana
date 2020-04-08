require 'power_assert/configuration'

if defined?(RubyVM)
  if PowerAssert.configuration._redefinition
    if RUBY_VERSION == '2.3.2'
      warn 'power_assert: It is strongly recommended that you use Ruby 2.3.3 or later which fixes regression on 2.3.2.'
      warn 'power_assert: See https://www.ruby-lang.org/en/news/2016/11/21/ruby-2-3-3-released/ for more details.'
    end

    verbose = $VERBOSE
    begin
      $VERBOSE = nil
      module PowerAssert
        # set redefined flag
        basic_classes = [
          Fixnum, Float, String, Array, Hash, Bignum, Symbol, Time, Regexp, NilClass, TrueClass, FalseClass
        ]

        basic_operators = [
          :+, :-, :*, :/, :%, :==, :===, :<, :<=, :<<, :[], :[]=,
          :length, :size, :empty?, :succ, :>, :>=, :!, :!=, :=~, :freeze, :-@, :max, :min
        ]

        bug11182 = Class.new do
          def fixed?
            true
          end
        end

        refine bug11182 do
          def fixed?
          end
        end

        _ = Class.new(bug11182) do
          alias _fixed? fixed?
          protected :_fixed?
        end

        if (bug11182.new.fixed? rescue false)
          basic_classes.each do |klass|
            basic_operators.each do |bop|
              if klass.public_method_defined?(bop)
                refine(klass) do
                  define_method(bop) {}
                end
              end
            end
          end
        else
          # workaround for https://bugs.ruby-lang.org/issues/11182
          basic_classes.each do |klass|
            basic_operators.each do |bop|
              if klass.public_method_defined?(bop)
                klass.ancestors.find {|i| i.instance_methods(false).index(bop) }.module_eval do
                  public bop
                end
              end
            end
          end

          refine Symbol do
            def ==
            end
          end
        end

        # bypass check_cfunc
        refine BasicObject do
          def !
          end

          def ==
          end
        end

        refine Module do
          def ==
          end
        end
      end
    ensure
      $VERBOSE = verbose
    end
  end

  # disable optimization
  RubyVM::InstructionSequence.compile_option = {
    specialized_instruction: false
  }
end
