require_relative "spec_helper"

describe "Blockless Ruby Filters" do
  before do
    db = Sequel.mock
    @d = db[:items].with_extend do
      def l(*args, &block)
        literal(filter_expr(*args, &block))
      end
      def lit(*args)
        literal(*args)
      end
    end
  end
  
  it "should support boolean columns directly" do
    x = Sequel[:x]
    x.dup.must_be_same_as x
    x.clone.must_be_same_as x
  end
  
  it "should support boolean columns directly" do
    @d.l(:x).must_equal 'x'
  end
  
  with_symbol_splitting "should support qualified columns and aliased columns using symbols" do
    @d.l(:x__y).must_equal 'x.y'
    @d.l(:x___y).must_equal 'x AS y'
    @d.l(:x__y___z).must_equal 'x.y AS z'
  end

  with_symbol_splitting "should support qualified columns using virtual rows" do
    @d.l(Sequel.expr{x__y}).must_equal 'x.y'
  end

  it "should not split symbols or virtual row methods if symbol splitting is disabled" do
    @d.l(:x__y).must_equal 'x__y'
    @d.l(:x___y).must_equal 'x___y'
    @d.l(:x__y___z).must_equal 'x__y___z'
    @d.l(Sequel.expr{x__y}).must_equal 'x__y'
  end

  it "should support NOT with SQL functions" do
    @d.l(~Sequel.function(:is_blah)).must_equal 'NOT is_blah()'
    @d.l(~Sequel.function(:is_blah, :x)).must_equal 'NOT is_blah(x)'
    @d.l(~Sequel.function(:is_blah, Sequel[:x][:y])).must_equal 'NOT is_blah(x.y)'
    @d.l(~Sequel.function(:is_blah, :x, Sequel[:x][:y])).must_equal 'NOT is_blah(x, x.y)'
  end

  it "should handle multiple ~" do
    @d.l(~Sequel.~(:x)).must_equal 'x'
    @d.l(~~Sequel.~(:x)).must_equal 'NOT x'
    @d.l(~~Sequel.&(:x, :y)).must_equal '(x AND y)'
    @d.l(~~Sequel.|(:x, :y)).must_equal '(x OR y)'
  end

  it "should not modifying boolean expression created from array if array is modified" do
    a = [1]
    expr = Sequel.expr(:b=>a)
    @d.l(expr).must_equal '(b IN (1))'
    a << 2
    @d.l(expr).must_equal '(b IN (1))'
  end

  it "should not modifying boolean expression created from string if string is modified" do
    a = '1'.dup
    expr = Sequel.expr(:b=>a)
    @d.l(expr).must_equal "(b = '1')"
    a << '2'
    @d.l(expr).must_equal "(b = '1')"
  end

  it "should support = via Hash" do
    @d.l(:x => 100).must_equal '(x = 100)'
    @d.l(:x => 'a').must_equal '(x = \'a\')'
    @d.l(:x => true).must_equal '(x IS TRUE)'
    @d.l(:x => false).must_equal '(x IS FALSE)'
    @d.l(:x => nil).must_equal '(x IS NULL)'
    @d.l(:x => [1,2,3]).must_equal '(x IN (1, 2, 3))'
  end

  it "should use = 't' and != 't' OR IS NULL if IS TRUE is not supported" do
    @d = @d.with_extend{def supports_is_true?; false end}
    @d.l(:x => true).must_equal "(x = 't')"
    @d.l(~Sequel.expr(:x => true)).must_equal "((x != 't') OR (x IS NULL))"
    @d.l(:x => false).must_equal "(x = 'f')"
    @d.l(~Sequel.expr(:x => false)).must_equal "((x != 'f') OR (x IS NULL))"
  end
  
  it "should support != via inverted Hash" do
    @d.l(~Sequel.expr(:x => 100)).must_equal '(x != 100)'
    @d.l(~Sequel.expr(:x => 'a')).must_equal '(x != \'a\')'
    @d.l(~Sequel.expr(:x => true)).must_equal '(x IS NOT TRUE)'
    @d.l(~Sequel.expr(:x => false)).must_equal '(x IS NOT FALSE)'
    @d.l(~Sequel.expr(:x => nil)).must_equal '(x IS NOT NULL)'
  end

  it "should use NOT for inverting boolean expressions where right hand side is function or literal strings" do
    @d.l(~Sequel.expr(:x => Sequel.function(:any))).must_equal 'NOT (x = any())'
    @d.l(~Sequel.expr(:x => Sequel.lit('any()'))).must_equal 'NOT (x = any())'
    @d.l(~Sequel.expr(:x => Sequel.lit('any(?)', 1))).must_equal 'NOT (x = any(1))'
  end
  
  it "should support = and similar operations via =~ method" do
    @d.l{x =~ 100}.must_equal '(x = 100)'
    @d.l{x =~ 'a'}.must_equal '(x = \'a\')'
    @d.l{x =~ true}.must_equal '(x IS TRUE)'
    @d.l{x =~ false}.must_equal '(x IS FALSE)'
    @d.l{x =~ nil}.must_equal '(x IS NULL)'
    @d.l{x =~ (1...5)}.must_equal '((x >= 1) AND (x < 5))'
    @d.l{x =~ [1,2,3]}.must_equal '(x IN (1, 2, 3))'

    @d.l{(x + y) =~ 100}.must_equal '((x + y) = 100)'
    @d.l{(x + y) =~ 'a'}.must_equal '((x + y) = \'a\')'
    @d.l{(x + y) =~ true}.must_equal '((x + y) IS TRUE)'
    @d.l{(x + y) =~ false}.must_equal '((x + y) IS FALSE)'
    @d.l{(x + y) =~ nil}.must_equal '((x + y) IS NULL)'
    @d.l{(x + y) =~ (1...5)}.must_equal '(((x + y) >= 1) AND ((x + y) < 5))'
    @d.l{(x + y) =~ [1,2,3]}.must_equal '((x + y) IN (1, 2, 3))'

    @d = @d.with_extend{def supports_regexp?; true end}
    @d.l{x =~ /blah/}.must_equal '(x ~ \'blah\')'
    @d.l{(x + y) =~ /blah/}.must_equal '((x + y) ~ \'blah\')'
  end

  it "should support != and similar inversions via !~ method" do
    @d.l{x !~ 100}.must_equal '(x != 100)'
    @d.l{x !~ 'a'}.must_equal '(x != \'a\')'
    @d.l{x !~ true}.must_equal '(x IS NOT TRUE)'
    @d.l{x !~ false}.must_equal '(x IS NOT FALSE)'
    @d.l{x !~ nil}.must_equal '(x IS NOT NULL)'
    @d.l{x !~ (1...5)}.must_equal '((x < 1) OR (x >= 5))'
    @d.l{x !~ [1,2,3]}.must_equal '(x NOT IN (1, 2, 3))'

    @d.l{(x + y) !~ 100}.must_equal '((x + y) != 100)'
    @d.l{(x + y) !~ 'a'}.must_equal '((x + y) != \'a\')'
    @d.l{(x + y) !~ true}.must_equal '((x + y) IS NOT TRUE)'
    @d.l{(x + y) !~ false}.must_equal '((x + y) IS NOT FALSE)'
    @d.l{(x + y) !~ nil}.must_equal '((x + y) IS NOT NULL)'
    @d.l{(x + y) !~ (1...5)}.must_equal '(((x + y) < 1) OR ((x + y) >= 5))'
    @d.l{(x + y) !~ [1,2,3]}.must_equal '((x + y) NOT IN (1, 2, 3))'

    @d = @d.with_extend{def supports_regexp?; true end}
    @d.l{x !~ /blah/}.must_equal '(x !~ \'blah\')'
    @d.l{(x + y) !~ /blah/}.must_equal '((x + y) !~ \'blah\')'
  end
  
  it "should support ~ via Hash and Regexp (if supported by database)" do
    @d = @d.with_extend{def supports_regexp?; true end}
    @d.l(:x => /blah/).must_equal '(x ~ \'blah\')'
  end
  
  it "should support !~ via inverted Hash and Regexp" do
    @d = @d.with_extend{def supports_regexp?; true end}
    @d.l(~Sequel.expr(:x => /blah/)).must_equal '(x !~ \'blah\')'
  end
  
  it "should support negating ranges" do
    @d.l(~Sequel.expr(:x => 1..5)).must_equal '((x < 1) OR (x > 5))'
    @d.l(~Sequel.expr(:x => 1...5)).must_equal '((x < 1) OR (x >= 5))'
  end
  
  it "should support negating IN with Dataset or Array" do
    @d.l(~Sequel.expr(:x => @d.select(:i))).must_equal '(x NOT IN (SELECT i FROM items))'
    @d.l(~Sequel.expr(:x => [1,2,3])).must_equal '(x NOT IN (1, 2, 3))'
  end

  it "should not add ~ method to string expressions" do
    proc{~Sequel.expr(:x).sql_string}.must_raise(NoMethodError) 
  end

  it "should only allow combining associative operators" do
    @d.lit(Sequel.expr{a + b + c}).must_equal '(a + b + c)'
    @d.lit(Sequel.expr{a - b - c}).must_equal '((a - b) - c)'
    @d.lit(Sequel.expr{a * b * c}).must_equal '(a * b * c)'
    @d.lit(Sequel.expr{a / b / c}).must_equal '((a / b) / c)'
    @d.lit(Sequel.expr{a & b & c}).must_equal '(a AND b AND c)'
    @d.lit(Sequel.expr{a | b | c}).must_equal '(a OR b OR c)'
    @d.lit(Sequel.expr{a.sql_string + b + c}).must_equal '(a || b || c)'
    @d.lit(Sequel.expr{a.sql_number >> b >> c}).must_equal '((a >> b) >> c)'
    @d.lit(Sequel.expr{a.sql_number << b << c}).must_equal '((a << b) << c)'
    @d.lit(Sequel.expr{a.sql_number % b % c}).must_equal '((a % b) % c)'
    @d.lit(Sequel.expr{a.sql_number & b & c}).must_equal '(a & b & c)'
    @d.lit(Sequel.expr{a.sql_number | b | c}).must_equal '(a | b | c)'
  end

  it "should allow mathematical or string operations on true, false, or nil" do
    @d.lit(Sequel.expr(:x) + 1).must_equal '(x + 1)'
    @d.lit(Sequel.expr(:x) - true).must_equal "(x - 't')"
    @d.lit(Sequel.expr(:x) / false).must_equal "(x / 'f')"
    @d.lit(Sequel.expr(:x) * nil).must_equal '(x * NULL)'
    @d.lit(Sequel.expr(:x) ** 1).must_equal 'power(x, 1)'
    @d.lit(Sequel.join([:x, nil])).must_equal '(x || NULL)'
  end

  it "should allow mathematical or string operations on boolean complex expressions" do
    @d.lit(Sequel.expr(:x) + (Sequel.expr(:y) + 1)).must_equal '(x + y + 1)'
    @d.lit(Sequel.expr(:x) - ~Sequel.expr(:y)).must_equal '(x - NOT y)'
    @d.lit(Sequel.expr(:x) / (Sequel.expr(:y) & :z)).must_equal '(x / (y AND z))'
    @d.lit(Sequel.expr(:x) * (Sequel.expr(:y) | :z)).must_equal '(x * (y OR z))'
    @d.lit(Sequel.expr(:x) + Sequel.expr(:y).like('a')).must_equal "(x + (y LIKE 'a' ESCAPE '\\'))"
    @d.lit(Sequel.expr(:x) - ~Sequel.expr(:y).like('a')).must_equal "(x - (y NOT LIKE 'a' ESCAPE '\\'))"
    @d.lit(Sequel.join([:x, ~Sequel.expr(:y).like('a')])).must_equal "(x || (y NOT LIKE 'a' ESCAPE '\\'))"
    @d.lit(Sequel.expr(:x) ** (Sequel.expr(:y) + 1)).must_equal 'power(x, (y + 1))'
  end

  it "should allow mathematical or string operations on numerics when argument is a generic or numeric expressions" do
    @d.lit(1 + Sequel.expr(:x)).must_equal '(1 + x)'
    @d.lit(2**65 - Sequel.+(:x, 1)).must_equal "(#{2**65} - (x + 1))"
    @d.lit(1.0 / Sequel.function(:x)).must_equal '(1.0 / x())'
    @d.lit(BigDecimal('1.0') * Sequel[:a][:y]).must_equal '(1.0 * a.y)'
    @d.lit(2 ** Sequel.cast(:x, Integer)).must_equal 'power(2, CAST(x AS integer))'
    @d.lit(1 + Sequel.lit('x')).must_equal '(1 + x)'
    @d.lit(1 + Sequel.lit('?', :x)).must_equal '(1 + x)'
  end

  it "should not break Date/DateTime equality" do
    (Date.today == Sequel.expr(:x)).must_equal false
    (DateTime.now == Sequel.expr(:x)).must_equal false
  end

  it "should have coerce return array if called on a non-numeric" do
    Sequel.expr(:x).coerce(:a).must_equal [Sequel.expr(:x), :a]
  end

  it "should support AND conditions via &" do
    @d.l(Sequel.expr(:x) & :y).must_equal '(x AND y)'
    @d.l(Sequel.expr(:x).sql_boolean & :y).must_equal '(x AND y)'
    @d.l(Sequel.expr(:x) & :y & :z).must_equal '(x AND y AND z)'
    @d.l(Sequel.expr(:x) & {:y => :z}).must_equal '(x AND (y = z))'
    @d.l((Sequel.expr(:x) + 200 < 0) & (Sequel.expr(:y) - 200 < 0)).must_equal '(((x + 200) < 0) AND ((y - 200) < 0))'
    @d.l(Sequel.expr(:x) & ~Sequel.expr(:y)).must_equal '(x AND NOT y)'
    @d.l(~Sequel.expr(:x) & :y).must_equal '(NOT x AND y)'
    @d.l(~Sequel.expr(:x) & ~Sequel.expr(:y)).must_equal '(NOT x AND NOT y)'
  end
  
  it "should support OR conditions via |" do
    @d.l(Sequel.expr(:x) | :y).must_equal '(x OR y)'
    @d.l(Sequel.expr(:x).sql_boolean | :y).must_equal '(x OR y)'
    @d.l(Sequel.expr(:x) | :y | :z).must_equal '(x OR y OR z)'
    @d.l(Sequel.expr(:x) | {:y => :z}).must_equal '(x OR (y = z))'
    @d.l((Sequel.expr(:x).sql_number > 200) | (Sequel.expr(:y).sql_number < 200)).must_equal '((x > 200) OR (y < 200))'
  end
  
  it "should support & | combinations" do
    @d.l((Sequel.expr(:x) | :y) & :z).must_equal '((x OR y) AND z)'
    @d.l(Sequel.expr(:x) | (Sequel.expr(:y) & :z)).must_equal '(x OR (y AND z))'
    @d.l((Sequel.expr(:x) & :w) | (Sequel.expr(:y) & :z)).must_equal '((x AND w) OR (y AND z))'
  end
  
  it "should support & | with ~" do
    @d.l(~((Sequel.expr(:x) | :y) & :z)).must_equal '((NOT x AND NOT y) OR NOT z)'
    @d.l(~(Sequel.expr(:x) | (Sequel.expr(:y) & :z))).must_equal '(NOT x AND (NOT y OR NOT z))'
    @d.l(~((Sequel.expr(:x) & :w) | (Sequel.expr(:y) & :z))).must_equal '((NOT x OR NOT w) AND (NOT y OR NOT z))'
    @d.l(~((Sequel.expr(:x).sql_number > 200) | (Sequel.expr(:y) & :z))).must_equal '((x <= 200) AND (NOT y OR NOT z))'
  end
  
  it "should support LiteralString" do
    @d.l(Sequel.lit('x')).must_equal '(x)'
    @d.l(~Sequel.lit('x')).must_equal 'NOT x'
    @d.l(~~Sequel.lit('x')).must_equal 'x'
    @d.l(~((Sequel.lit('x') | :y) & :z)).must_equal '((NOT x AND NOT y) OR NOT z)'
    @d.l(~(Sequel.expr(:x) | Sequel.lit('y'))).must_equal '(NOT x AND NOT y)'
    @d.l(~(Sequel.lit('x') & Sequel.lit('y'))).must_equal '(NOT x OR NOT y)'
    @d.l(Sequel.expr(Sequel.lit('y') => Sequel.lit('z')) & Sequel.lit('x')).must_equal '((y = z) AND x)'
    @d.l((Sequel.lit('x') > 200) & (Sequel.lit('y') < 200)).must_equal '((x > 200) AND (y < 200))'
    @d.l(~(Sequel.lit('x') + 1 > 100)).must_equal '((x + 1) <= 100)'
    @d.l(Sequel.lit('x').like('a')).must_equal '(x LIKE \'a\' ESCAPE \'\\\')'
    @d.l(Sequel.lit('x') + 1 > 100).must_equal '((x + 1) > 100)'
    @d.l((Sequel.lit('x') * :y) < 100.01).must_equal '((x * y) < 100.01)'
    @d.l((Sequel.lit('x') ** :y) < 100.01).must_equal '(power(x, y) < 100.01)'
    @d.l((Sequel.lit('x') - Sequel.expr(:y)/2) >= 100000000000000000000000000000000000).must_equal '((x - (y / 2)) >= 100000000000000000000000000000000000)'
    @d.l((Sequel.lit('z') * ((Sequel.lit('x') / :y)/(Sequel.expr(:x) + :y))) <= 100).must_equal '((z * ((x / y) / (x + y))) <= 100)'
    @d.l(~((((Sequel.lit('x') - :y)/(Sequel.expr(:x) + :y))*:z) <= 100)).must_equal '((((x - y) / (x + y)) * z) > 100)'
  end

  it "should have LiteralString#inspect show it is a literal string" do
    Sequel.lit('x').inspect.must_equal "#<Sequel::LiteralString \"x\">"
  end

  it "should support hashes by ANDing the conditions" do
    @d.l(:x => 100, :y => 'a')[1...-1].split(' AND ').sort.must_equal ['(x = 100)', '(y = \'a\')']
    @d.l(:x => true, :y => false)[1...-1].split(' AND ').sort.must_equal ['(x IS TRUE)', '(y IS FALSE)']
    @d.l(:x => nil, :y => [1,2,3])[1...-1].split(' AND ').sort.must_equal ['(x IS NULL)', '(y IN (1, 2, 3))']
  end
  
  it "should support arrays with all two pairs the same as hashes" do
    @d.l([[:x, 100],[:y, 'a']]).must_equal '((x = 100) AND (y = \'a\'))'
    @d.l([[:x, true], [:y, false]]).must_equal '((x IS TRUE) AND (y IS FALSE))'
    @d.l([[:x, nil], [:y, [1,2,3]]]).must_equal '((x IS NULL) AND (y IN (1, 2, 3)))'
  end
  
  it "should emulate columns for array values" do
    @d.l([:x, :y]=>Sequel.value_list([[1,2], [3,4]])).must_equal '((x, y) IN ((1, 2), (3, 4)))'
    @d.l([:x, :y, :z]=>[[1,2,5], [3,4,6]]).must_equal '((x, y, z) IN ((1, 2, 5), (3, 4, 6)))'
  end
  
  it "should emulate multiple column in if not supported" do
    @d = @d.with_extend{def supports_multiple_column_in?; false end}
    @d.l([:x, :y]=>Sequel.value_list([[1,2], [3,4]])).must_equal '(((x = 1) AND (y = 2)) OR ((x = 3) AND (y = 4)))'
    @d.l([:x, :y, :z]=>[[1,2,5], [3,4,6]]).must_equal '(((x = 1) AND (y = 2) AND (z = 5)) OR ((x = 3) AND (y = 4) AND (z = 6)))'
  end

  it "should have SQL::ValueList#inspect show it is a value list" do
    Sequel.value_list([[1,2], [3,4]]).inspect.must_equal "#<Sequel::SQL::ValueList [[1, 2], [3, 4]]>"
  end
  
  it "should support StringExpression#+ for concatenation of SQL strings" do
    @d.lit(Sequel.expr(:x).sql_string + :y).must_equal '(x || y)'
    @d.lit(Sequel.join([:x]) + :y).must_equal '(x || y)'
    @d.lit(Sequel.join([:x, :z], ' ') + :y).must_equal "(x || ' ' || z || y)"
  end

  it "should be supported inside blocks" do
    @d.l{Sequel.or([[:x, nil], [:y, [1,2,3]]])}.must_equal '((x IS NULL) OR (y IN (1, 2, 3)))'
    @d.l{Sequel.~([[:x, nil], [:y, [1,2,3]]])}.must_equal '((x IS NOT NULL) OR (y NOT IN (1, 2, 3)))'
    @d.l{~((((Sequel.lit('x') - :y)/(Sequel.expr(:x) + :y))*:z) <= 100)}.must_equal '((((x - y) / (x + y)) * z) > 100)'
    @d.l{Sequel.&({:x => :a}, {:y => :z})}.must_equal '((x = a) AND (y = z))'
  end

  it "should support &, |, ^, ~, <<, and >> for NumericExpressions" do
    @d.l(Sequel.expr(:x).sql_number & 1 > 100).must_equal '((x & 1) > 100)'
    @d.l(Sequel.expr(:x).sql_number | 1 > 100).must_equal '((x | 1) > 100)'
    @d.l(Sequel.expr(:x).sql_number ^ 1 > 100).must_equal '((x ^ 1) > 100)'
    @d.l(~Sequel.expr(:x).sql_number > 100).must_equal '(~x > 100)'
    @d.l(Sequel.expr(:x).sql_number << 1 > 100).must_equal '((x << 1) > 100)'
    @d.l(Sequel.expr(:x).sql_number >> 1 > 100).must_equal '((x >> 1) > 100)'
    @d.l((Sequel.expr(:x) + 1) & 1 > 100).must_equal '(((x + 1) & 1) > 100)'
    @d.l((Sequel.expr(:x) + 1) | 1 > 100).must_equal '(((x + 1) | 1) > 100)'
    @d.l((Sequel.expr(:x) + 1) ^ 1 > 100).must_equal '(((x + 1) ^ 1) > 100)'
    @d.l(~(Sequel.expr(:x) + 1) > 100).must_equal '(~(x + 1) > 100)'
    @d.l((Sequel.expr(:x) + 1) << 1 > 100).must_equal '(((x + 1) << 1) > 100)'
    @d.l((Sequel.expr(:x) + 1) >> 1 > 100).must_equal '(((x + 1) >> 1) > 100)'
    @d.l((Sequel.expr(:x) + 1) & (Sequel.expr(:x) + 2) > 100).must_equal '(((x + 1) & (x + 2)) > 100)'
  end

  it "should allow using a Bitwise method on a ComplexExpression that isn't a NumericExpression" do
    @d.lit((Sequel.expr(:x) + 1) & (Sequel.expr(:x) + '2')).must_equal "((x + 1) & (x || '2'))"
  end

  it "should allow using a Boolean method on a ComplexExpression that isn't a BooleanExpression" do
    @d.l(Sequel.expr(:x) & (Sequel.expr(:x) + '2')).must_equal "(x AND (x || '2'))"
  end

  it "should raise an error if attempting to invert a ComplexExpression that isn't a BooleanExpression" do
    proc{Sequel::SQL::BooleanExpression.invert(Sequel.expr(:x) + 2)}.must_raise(Sequel::Error)
  end

  it "should support SQL::Constants" do
    @d.l({:x => Sequel::NULL}).must_equal '(x IS NULL)'
    @d.l({:x => Sequel::NOTNULL}).must_equal '(x IS NOT NULL)'
    @d.l({:x => Sequel::TRUE}).must_equal '(x IS TRUE)'
    @d.l({:x => Sequel::FALSE}).must_equal '(x IS FALSE)'
    @d.l({:x => Sequel::SQLTRUE}).must_equal '(x IS TRUE)'
    @d.l({:x => Sequel::SQLFALSE}).must_equal '(x IS FALSE)'

    @d.l({:x => Sequel::CURRENT_DATE}).must_equal '(x = CURRENT_DATE)'
    @d.l({:x => Sequel::CURRENT_TIME}).must_equal '(x = CURRENT_TIME)'
    @d.l({:x => Sequel::CURRENT_TIMESTAMP}).must_equal '(x = CURRENT_TIMESTAMP)'
    @d.l({:x => Sequel::DEFAULT}).must_equal '(x = DEFAULT)'
  end
  
  it "should support negation of SQL::Constants" do
    @d.l(Sequel.~(:x => Sequel::NULL)).must_equal '(x IS NOT NULL)'
    @d.l(Sequel.~(:x => Sequel::NOTNULL)).must_equal '(x IS NULL)'
    @d.l(Sequel.~(:x => Sequel::TRUE)).must_equal '(x IS NOT TRUE)'
    @d.l(Sequel.~(:x => Sequel::FALSE)).must_equal '(x IS NOT FALSE)'
    @d.l(Sequel.~(:x => Sequel::SQLTRUE)).must_equal '(x IS NOT TRUE)'
    @d.l(Sequel.~(:x => Sequel::SQLFALSE)).must_equal '(x IS NOT FALSE)'
  end
  
  it "should support direct negation of SQL::Constants" do
    @d.l({:x => ~Sequel::NULL}).must_equal '(x IS NOT NULL)'
    @d.l({:x => ~Sequel::NOTNULL}).must_equal '(x IS NULL)'
    @d.l({:x => ~Sequel::TRUE}).must_equal '(x IS FALSE)'
    @d.l({:x => ~Sequel::FALSE}).must_equal '(x IS TRUE)'
    @d.l({:x => ~Sequel::SQLTRUE}).must_equal '(x IS FALSE)'
    @d.l({:x => ~Sequel::SQLFALSE}).must_equal '(x IS TRUE)'
  end
  
  it "should raise an error if trying to invert an invalid SQL::Constant" do
    proc{~Sequel::CURRENT_DATE}.must_raise(Sequel::Error)
  end

  it "should raise an error if trying to create an invalid complex expression" do
    proc{Sequel::SQL::ComplexExpression.new(:BANG, 1, 2)}.must_raise(Sequel::Error)
  end

  it "should use a string concatentation for + if given a string" do
    @d.lit(Sequel.expr(:x) + '1').must_equal "(x || '1')"
    @d.lit(Sequel.expr(:x) + '1' + '1').must_equal "(x || '1' || '1')"
  end

  it "should use an addition for + if given a literal string" do
    @d.lit(Sequel.expr(:x) + Sequel.lit('1')).must_equal "(x + 1)"
    @d.lit(Sequel.expr(:x) + Sequel.lit('1') + Sequel.lit('1')).must_equal "(x + 1 + 1)"
  end

  it "should use a bitwise operator for & and | if given an integer" do
    @d.lit(Sequel.expr(:x) & 1).must_equal "(x & 1)"
    @d.lit(Sequel.expr(:x) | 1).must_equal "(x | 1)"
    @d.lit(Sequel.expr(:x) & 1 & 1).must_equal "(x & 1 & 1)"
    @d.lit(Sequel.expr(:x) | 1 | 1).must_equal "(x | 1 | 1)"
  end
  
  it "should allow adding a string to an integer expression" do
    @d.lit(Sequel.expr(:x) + 1 + 'a').must_equal "(x + 1 + 'a')"
  end

  it "should allow adding an integer to an string expression" do
    @d.lit(Sequel.expr(:x) + 'a' + 1).must_equal "(x || 'a' || 1)"
  end

  it "should allow adding a boolean to an integer expression" do
    @d.lit(Sequel.expr(:x) + 1 + true).must_equal "(x + 1 + 't')"
  end

  it "should allow adding a boolean to an string expression" do
    @d.lit(Sequel.expr(:x) + 'a' + true).must_equal "(x || 'a' || 't')"
  end

  it "should allow using a boolean operation with an integer on an boolean expression" do
    @d.lit(Sequel.expr(:x) & :a & 1).must_equal "(x AND a AND 1)"
  end

  it "should allow using a boolean operation with a string on an boolean expression" do
    @d.lit(Sequel.expr(:x) & :a & 'a').must_equal "(x AND a AND 'a')"
  end

  it "should allowing AND of boolean expression and literal string" do
   @d.lit(Sequel.expr(:x) & :a & Sequel.lit('a')).must_equal "(x AND a AND a)"
  end

  it "should allowing + of integer expression and literal string" do
   @d.lit(Sequel.expr(:x) + :a + Sequel.lit('a')).must_equal "(x + a + a)"
  end

  it "should allowing + of string expression and literal string" do
   @d.lit(Sequel.expr(:x) + 'a' + Sequel.lit('a')).must_equal "(x || 'a' || a)"
  end

  it "should allow sql_{string,boolean,number} methods on numeric expressions" do
   @d.lit((Sequel.expr(:x) + 1).sql_string + 'a').must_equal "((x + 1) || 'a')"
   @d.lit((Sequel.expr(:x) + 1).sql_boolean & 1).must_equal "((x + 1) AND 1)"
   @d.lit((Sequel.expr(:x) + 1).sql_number + 'a').must_equal "(x + 1 + 'a')"
  end

  it "should allow sql_{string,boolean,number} methods on string expressions" do
   @d.lit((Sequel.expr(:x) + 'a').sql_string + 'a').must_equal "(x || 'a' || 'a')"
   @d.lit((Sequel.expr(:x) + 'a').sql_boolean & 1).must_equal "((x || 'a') AND 1)"
   @d.lit((Sequel.expr(:x) + 'a').sql_number + 'a').must_equal "((x || 'a') + 'a')"
  end

  it "should allow sql_{string,boolean,number} methods on boolean expressions" do
   @d.lit((Sequel.expr(:x) & :y).sql_string + 'a').must_equal "((x AND y) || 'a')"
   @d.lit((Sequel.expr(:x) & :y).sql_boolean & 1).must_equal "(x AND y AND 1)"
   @d.lit((Sequel.expr(:x) & :y).sql_number + 'a').must_equal "((x AND y) + 'a')"
  end

  it "should raise an error if trying to literalize an invalid complex expression" do
    ce = Sequel::SQL::ComplexExpression.allocate
    ce.instance_eval do
      @op = :BANG
      @args = [:x, 1]
    end
    proc{@d.lit(ce)}.must_raise(Sequel::InvalidOperation)
  end

  it "should support equality comparison of two expressions" do
    e1 = ~Sequel.like(:comment, '%:hidden:%')
    e2 = ~Sequel.like(:comment, '%:hidden:%')
    e1.must_equal e2
  end

  it "should support expression filter methods on Datasets" do
    d = @d.select(:a)

    @d.lit(d + 1).must_equal '((SELECT a FROM items) + 1)'
    @d.lit(d - 1).must_equal '((SELECT a FROM items) - 1)'
    @d.lit(d * 1).must_equal '((SELECT a FROM items) * 1)'
    @d.lit(d / 1).must_equal '((SELECT a FROM items) / 1)'
    @d.lit(d ** 1).must_equal 'power((SELECT a FROM items), 1)'

    @d.lit(d => 1).must_equal '((SELECT a FROM items) = 1)'
    @d.lit(Sequel.~(d => 1)).must_equal '((SELECT a FROM items) != 1)'
    @d.lit(d > 1).must_equal '((SELECT a FROM items) > 1)'
    @d.lit(d < 1).must_equal '((SELECT a FROM items) < 1)'
    @d.lit(d >= 1).must_equal '((SELECT a FROM items) >= 1)'
    @d.lit(d <= 1).must_equal '((SELECT a FROM items) <= 1)'

    @d.lit(d.as(:b)).must_equal '(SELECT a FROM items) AS b'

    @d.lit(d & :b).must_equal '((SELECT a FROM items) AND b)'
    @d.lit(d | :b).must_equal '((SELECT a FROM items) OR b)'
    @d.lit(~d).must_equal 'NOT (SELECT a FROM items)'

    @d.lit(d.cast(Integer)).must_equal 'CAST((SELECT a FROM items) AS integer)'
    @d.lit(d.cast_numeric).must_equal 'CAST((SELECT a FROM items) AS integer)'
    @d.lit(d.cast_string).must_equal 'CAST((SELECT a FROM items) AS varchar(255))'
    @d.lit(d.cast_numeric << :b).must_equal '(CAST((SELECT a FROM items) AS integer) << b)'
    @d.lit(d.cast_string + :b).must_equal '(CAST((SELECT a FROM items) AS varchar(255)) || b)'

    @d.lit(d.extract(:year)).must_equal 'extract(year FROM (SELECT a FROM items))'
    @d.lit(d.sql_boolean & :b).must_equal '((SELECT a FROM items) AND b)'
    @d.lit(d.sql_number << :b).must_equal '((SELECT a FROM items) << b)'
    @d.lit(d.sql_string + :b).must_equal '((SELECT a FROM items) || b)'

    @d.lit(d.asc).must_equal '(SELECT a FROM items) ASC'
    @d.lit(d.desc).must_equal '(SELECT a FROM items) DESC'

    @d.lit(d.like(:b)).must_equal '((SELECT a FROM items) LIKE b ESCAPE \'\\\')'
    @d.lit(d.ilike(:b)).must_equal '(UPPER((SELECT a FROM items)) LIKE UPPER(b) ESCAPE \'\\\')'
  end

  it "should handled emulated char_length function" do
    @d.lit(Sequel.char_length(:a)).must_equal 'char_length(a)'
  end

  it "should handled emulated trim function" do
    @d.lit(Sequel.trim(:a)).must_equal 'trim(a)'
  end

  it "should handled emulated function where only name is emulated" do
    ds = Sequel.mock[:a]
    ds.literal(Sequel.trim(:a)).must_equal 'trim(a)'
    ds.with_extend{def native_function_name(f) 'foo' end}.literal(Sequel.trim(:a)).must_equal 'foo(a)'
  end

  it "should handled emulated function needing full emulation" do
    dsc = Class.new(Sequel::Dataset) do
      def emulate_function?(n) n == :trim end
      def emulate_function_sql_append(sql, f)
        sql << "#{f.name}FOO(lower(#{f.args.first}))"
      end
    end
    dsc.new(@d.db).literal(Sequel.trim(:a)).must_equal 'trimFOO(lower(a))'
  end

  it "should handle endless ranges" do
    endless = eval('1..')
    @d.l{x =~ endless}.must_equal '(x >= 1)'
    @d.l(:x => endless).must_equal '(x >= 1)'

    endless = eval('1...')
    @d.l{x =~ endless}.must_equal '(x >= 1)'
    @d.l(:x => endless).must_equal '(x >= 1)'
  end if RUBY_VERSION >= '2.6'

  it "should handle startless ranges" do
    endless = eval('..1')
    @d.l{x =~ endless}.must_equal '(x <= 1)'
    @d.l(:x => endless).must_equal '(x <= 1)'

    endless = eval('...1')
    @d.l{x =~ endless}.must_equal '(x < 1)'
    @d.l(:x => endless).must_equal '(x < 1)'
  end if RUBY_VERSION >= '2.7'

  it "should handle startless, endless ranges" do
    endless = eval('nil..nil')
    @d.l{x =~ endless}.must_equal '(1 = 1)'
    @d.l(:x => endless).must_equal '(1 = 1)'

    endless = eval('nil...nil')
    @d.l{x =~ endless}.must_equal '(1 = 1)'
    @d.l(:x => endless).must_equal '(1 = 1)'
  end if RUBY_VERSION >= '2.7'
end

describe Sequel::SQL::VirtualRow do
  before do
    @d = Sequel.mock[:items].with_quote_identifiers(true).with_extend do
      def supports_window_functions?; true end
      def l(*args, &block)
        literal(filter_expr(*args, &block))
      end
    end
  end

  it "should treat methods without arguments as identifiers" do
    @d.l{column}.must_equal '"column"'
  end

  with_symbol_splitting "should treat methods without arguments that have embedded double underscores as qualified identifiers" do
    @d.l{table__column}.must_equal '"table"."column"'
  end

  it "should treat methods with arguments as functions with the arguments" do
    @d.l{function(arg1, 10, 'arg3')}.must_equal 'function("arg1", 10, \'arg3\')'
  end


  it "should treat methods followed by function as a function call with no arguments" do
    @d.l{version.function}.must_equal 'version()'
  end

  it "should treat methods followed by function.* as a function call with * argument" do
    @d.l{count.function.*}.must_equal 'count(*)'
  end

  it "should support * method on functions to raise error if function already has an argument" do
    proc{@d.l{count(1).*}}.must_raise(Sequel::Error)
  end

  it "should support * method on functions to use * as the argument" do
    @d.l{count.function.*}.must_equal 'count(*)'
    @d.literal(Sequel.expr{sum(1) * 2}).must_equal '(sum(1) * 2)'
  end

  it "should support distinct methods on functions to use DISTINCT before the arguments" do
    @d.l{count(column1).distinct}.must_equal 'count(DISTINCT "column1")'
    @d.l{count(column1, column2).distinct}.must_equal 'count(DISTINCT "column1", "column2")'
  end

  it "should handle method.function.over as a window function call" do
    @d.l{rank.function.over}.must_equal 'rank() OVER ()'
  end

  it "should handle method.function.over(:partition) as a window function call" do
    @d.l{rank.function.over(:partition=>column1)}.must_equal 'rank() OVER (PARTITION BY "column1")'
    @d.l{rank.function.over(:partition=>[column1, column2])}.must_equal 'rank() OVER (PARTITION BY "column1", "column2")'
  end

  it "should handle method(arg).over options as a window function call" do
    @d.l{avg(column1).over}.must_equal 'avg("column1") OVER ()'
    @d.l{avg(column1, column2).over}.must_equal 'avg("column1", "column2") OVER ()'
  end

  it "should handle method.function.over(:order) as a window function call" do
    @d.l{rank.function.over(:order=>column1)}.must_equal 'rank() OVER (ORDER BY "column1")'
    @d.l{rank.function.over(:order=>[column1, column2])}.must_equal 'rank() OVER (ORDER BY "column1", "column2")'
  end

  it "should handle method.function.over(:window) as a window function call" do
    @d.l{rank.function.over(:window=>:win)}.must_equal 'rank() OVER ("win")'
  end

  it "should handle method.function.*.over as a window function call" do
    @d.l{count.function.*.over}.must_equal 'count(*) OVER ()'
  end

  it "should handle method.function.over(:frame=>:all) as a window function call with frame for all rows" do
    @d.l{rank.function.over(:frame=>:all)}.must_equal 'rank() OVER (ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)'
  end

  it "should handle method.function.over(:frame=>:rows) as a window function call with frame for all rows before current row" do
    @d.l{rank.function.over(:frame=>:rows)}.must_equal 'rank() OVER (ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)'
  end

  it "should handle method.function.over(:frame=>:groups) as a window function call with frame for all groups before current row" do
    @d.l{rank.function.over(:frame=>:groups)}.must_equal 'rank() OVER (GROUPS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)'
  end

  it "should handle method.function.over(:frame=>:range) as a window function call with frame for all groups before current row" do
    @d.l{rank.function.over(:frame=>:range)}.must_equal 'rank() OVER (RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)'
  end

  it "should handle window function with :frame hash argument with :type option" do
    @d.l{rank.function.over(:frame=>{:type=>:rows, :start=>:preceding})}.must_equal 'rank() OVER (ROWS UNBOUNDED PRECEDING)'
    @d.l{rank.function.over(:frame=>{:type=>:range, :start=>:preceding})}.must_equal 'rank() OVER (RANGE UNBOUNDED PRECEDING)'
    @d.l{rank.function.over(:frame=>{:type=>:groups, :start=>:preceding})}.must_equal 'rank() OVER (GROUPS UNBOUNDED PRECEDING)'
  end

  it "should handle window function with :frame hash argument with :start option" do
    @d.l{rank.function.over(:frame=>{:type=>:rows, :start=>:preceding})}.must_equal 'rank() OVER (ROWS UNBOUNDED PRECEDING)'
    @d.l{rank.function.over(:frame=>{:type=>:rows, :start=>:following})}.must_equal 'rank() OVER (ROWS UNBOUNDED FOLLOWING)'
    @d.l{rank.function.over(:frame=>{:type=>:rows, :start=>:current})}.must_equal 'rank() OVER (ROWS CURRENT ROW)'
    @d.l{rank.function.over(:frame=>{:type=>:rows, :start=>1})}.must_equal 'rank() OVER (ROWS 1 PRECEDING)'
    @d.l{rank.function.over(:frame=>{:type=>:rows, :start=>[1, :following]})}.must_equal 'rank() OVER (ROWS 1 FOLLOWING)'
  end

  it "should handle window function with :frame hash argument with :end option" do
    @d.l{rank.function.over(:frame=>{:type=>:rows, :start=>:preceding, :end=>:preceding})}.must_equal 'rank() OVER (ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED PRECEDING)'
    @d.l{rank.function.over(:frame=>{:type=>:rows, :start=>:preceding, :end=>:following})}.must_equal 'rank() OVER (ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)'
    @d.l{rank.function.over(:frame=>{:type=>:rows, :start=>:preceding, :end=>:current})}.must_equal 'rank() OVER (ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)'
    @d.l{rank.function.over(:frame=>{:type=>:rows, :start=>:preceding, :end=>1})}.must_equal 'rank() OVER (ROWS BETWEEN UNBOUNDED PRECEDING AND 1 FOLLOWING)'
    @d.l{rank.function.over(:frame=>{:type=>:rows, :start=>:preceding, :end=>[1, :preceding]})}.must_equal 'rank() OVER (ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING)'
  end

  it "should handle window function with :frame hash argument with :exclude option" do
    @d.l{rank.function.over(:frame=>{:type=>:rows, :start=>:preceding,:exclude=>:current})}.must_equal 'rank() OVER (ROWS UNBOUNDED PRECEDING EXCLUDE CURRENT ROW)'
    @d.l{rank.function.over(:frame=>{:type=>:rows, :start=>:preceding, :exclude=>:group})}.must_equal 'rank() OVER (ROWS UNBOUNDED PRECEDING EXCLUDE GROUP)'
    @d.l{rank.function.over(:frame=>{:type=>:rows, :start=>:preceding, :exclude=>:ties})}.must_equal 'rank() OVER (ROWS UNBOUNDED PRECEDING EXCLUDE TIES)'
    @d.l{rank.function.over(:frame=>{:type=>:rows, :start=>:preceding, :exclude=>:no_others})}.must_equal 'rank() OVER (ROWS UNBOUNDED PRECEDING EXCLUDE NO OTHERS)'
  end

  it "should handle window function with :frame hash argument with invalid options" do
    proc{@d.l{rank.function.over(:frame=>{:type=>:blah, :start=>:preceding})}}.must_raise Sequel::Error
    proc{@d.l{rank.function.over(:frame=>{:type=>:rows})}}.must_raise Sequel::Error
    proc{@d.l{rank.function.over(:frame=>{:type=>:rows, :start=>:blah})}}.must_raise Sequel::Error
    proc{@d.l{rank.function.over(:frame=>{:type=>:rows, :start=>[1, :blah]})}}.must_raise Sequel::Error
    proc{@d.l{rank.function.over(:frame=>{:type=>:rows, :start=>[1, :preceding, 3]})}}.must_raise Sequel::Error
    proc{@d.l{rank.function.over(:frame=>{:type=>:rows, :start=>:preceding, :end=>:blah})}}.must_raise Sequel::Error
    proc{@d.l{rank.function.over(:frame=>{:type=>:rows, :start=>:preceding, :end=>[1, :blah]})}}.must_raise Sequel::Error
    proc{@d.l{rank.function.over(:frame=>{:type=>:rows, :start=>:preceding, :end=>[1, :following, 3]})}}.must_raise Sequel::Error
    proc{@d.l{rank.function.over(:frame=>{:type=>:rows, :start=>:preceding, :exclude=>:blah})}}.must_raise Sequel::Error
  end

  it "should handle method.function.over(:frame=>'some string') as a window function call with explicit frame" do
    @d.l{rank.function.over(:frame=>'RANGE BETWEEN 3 PRECEDING AND CURRENT ROW')}.must_equal 'rank() OVER (RANGE BETWEEN 3 PRECEDING AND CURRENT ROW)'
  end

  it "should support window functions options" do
    @d.supports_window_function_frame_option?(:rows).must_equal true
    @d.supports_window_function_frame_option?(:range).must_equal true
    @d.supports_window_function_frame_option?(:groups).must_equal false
    @d.supports_window_function_frame_option?(:offset).must_equal true
    @d.supports_window_function_frame_option?(:exclude).must_equal false
  end

  it "should raise an error if an invalid :frame option is used" do
    proc{@d.l{rank.function.over(:frame=>:blah)}}.must_raise(Sequel::Error)
  end

  it "should support all over options together" do
    @d.l{count.function.*.over(:partition=>a, :order=>b, :window=>:win, :frame=>:rows)}.must_equal 'count(*) OVER ("win" PARTITION BY "a" ORDER BY "b" ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)'
  end

  it "should support order method on functions to specify orders for aggregate functions" do
    @d.l{rank(:c).order(:a, :b)}.must_equal 'rank("c" ORDER BY "a", "b")'
  end

  it "should support over method on functions to create window functions" do
    @d.l{sum(c).over(:partition=>a, :order=>b, :window=>:win, :frame=>:rows)}.must_equal 'sum("c") OVER ("win" PARTITION BY "a" ORDER BY "b" ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)'
  end

  it "should support over method with a Window argument" do
    @d.l{sum(c).over(Sequel::SQL::Window.new(:partition=>a, :order=>b, :window=>:win, :frame=>:rows))}.must_equal 'sum("c") OVER ("win" PARTITION BY "a" ORDER BY "b" ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)'
  end

  it "should raise error if over is called on a function that already has a window " do
    proc{@d.l{rank.function.over.over}}.must_raise(Sequel::Error)
  end

  it "should raise an error if window functions are not supported" do
    proc{@d.with_extend{def supports_window_functions?; false end}.l{count.function.*.over(:partition=>a, :order=>b, :window=>:win, :frame=>:rows)}}.must_raise(Sequel::Error)
    proc{Sequel.mock.dataset.filter{count.function.*.over(:partition=>a, :order=>b, :window=>:win, :frame=>:rows)}.sql}.must_raise(Sequel::Error)
  end
  
  it "should handle lateral function calls" do
    @d.l{rank.function.lateral}.must_equal 'LATERAL rank()' 
  end

  it "should handle ordered-set and hypothetical-set function calls" do
    @d.l{mode.function.within_group(:a)}.must_equal 'mode() WITHIN GROUP (ORDER BY "a")' 
    @d.l{mode.function.within_group(:a, :b)}.must_equal 'mode() WITHIN GROUP (ORDER BY "a", "b")' 
  end

  it "should handle emualted filtered aggregate function calls" do
    @d.l{count.function.*.filter(Sequel.&(:a, :b))}.must_equal 'count((CASE WHEN ("a" AND "b") THEN 1 ELSE NULL END))' 
    @d.l{count.function.*.filter(:a=>1)}.must_equal 'count((CASE WHEN ("a" = 1) THEN 1 ELSE NULL END))'
    @d.l{count(:a).filter{b > 1}}.must_equal 'count((CASE WHEN ("b" > 1) THEN "a" ELSE NULL END))'
    @d.l{count(:a).filter(:a=>1){b > 1}}.must_equal 'count((CASE WHEN (("a" = 1) AND ("b" > 1)) THEN "a" ELSE NULL END))'
  end

  it "should handle filtered aggregate function calls" do
    @d = @d.with_extend{def supports_filtered_aggregates?; true end}
    @d.l{count.function.*.filter(Sequel.&(:a, :b))}.must_equal 'count(*) FILTER (WHERE ("a" AND "b"))' 
    @d.l{count.function.*.filter(:a=>1)}.must_equal 'count(*) FILTER (WHERE ("a" = 1))'
    @d.l{count.function.*.filter{b > 1}}.must_equal 'count(*) FILTER (WHERE ("b" > 1))'
    @d.l{count.function.*.filter(:a=>1){b > 1}}.must_equal 'count(*) FILTER (WHERE (("a" = 1) AND ("b" > 1)))'
  end

  it "should handle filtered ordered-set and hypothetical-set function calls" do
    @d = @d.with_extend{def supports_filtered_aggregates?; true end}
    @d.l{mode.function.within_group(:a).filter(:a=>1)}.must_equal 'mode() WITHIN GROUP (ORDER BY "a") FILTER (WHERE ("a" = 1))' 
  end

  it "should handle function calls with ordinality" do
    @d.l{foo.function.with_ordinality}.must_equal 'foo() WITH ORDINALITY' 
  end

  it "should support function method on identifiers to create functions" do
    @d.l{rank.function}.must_equal 'rank()' 
    @d.l{sum.function(c)}.must_equal 'sum("c")'
    @d.l{sum.function(c, 1)}.must_equal 'sum("c", 1)'
  end

  with_symbol_splitting "should support function method on foo__bar methods to create functions" do
    @d.l{sch__rank.function}.must_equal 'sch.rank()' 
    @d.l{sch__sum.function(c)}.must_equal 'sch.sum("c")'
    @d.l{sch__sum.function(c, 1)}.must_equal 'sch.sum("c", 1)'
    @d.l{Sequel.qualify(sch[:sum], x[:y]).function(c, 1)}.must_equal 'sch.sum.x.y("c", 1)'
  end

  it "should support function method on qualified identifiers to create functions" do
    @d.l{sch[rank].function}.must_equal 'sch.rank()' 
    @d.l{sch[sum].function(c)}.must_equal 'sch.sum("c")'
    @d.l{sch[sum].function(c, 1)}.must_equal 'sch.sum("c", 1)'
    @d.l{Sequel.qualify(sch[:sum], x[:y]).function(c, 1)}.must_equal 'sch.sum.x.y("c", 1)'
  end

  with_symbol_splitting "should support function method on qualified identifiers to create functions" do
    @d.l{Sequel.qualify(sch__sum, :x__y).function(c, 1)}.must_equal 'sch.sum.x.y("c", 1)'
  end

  it "should not quote function names created from identifiers by default" do
    @d = @d.with_extend{def supports_quoted_function_names?; true end}
    @d.l{rank.function}.must_equal 'rank()' 
  end

  with_symbol_splitting "should handle quoted function names when using double underscores" do
    @d = @d.with_extend{def supports_quoted_function_names?; true end}
    @d.l{sch__rank.function}.must_equal '"sch"."rank"()' 
  end

  it "should quote function names if a quoted function is used and database supports quoted function names" do
    @d = @d.with_extend{def supports_quoted_function_names?; true end}
    @d.l{rank(1).quoted}.must_equal '"rank"(1)' 
    @d.l{rank.function.quoted}.must_equal '"rank"()' 
    @d.l{sch__rank(1).quoted}.must_equal '"sch__rank"(1)' 
  end

  it "should not quote function names created from qualified identifiers if an unquoted function is used" do
    @d = @d.with_extend{def supports_quoted_function_names?; true end}
    @d.l{sch[rank].function.unquoted}.must_equal 'sch.rank()' 
  end

  it "should deal with classes without requiring :: prefix" do
    @d.l{date < Date.today}.must_equal "(\"date\" < '#{Date.today}')"
    @d.l{date < Sequel::CURRENT_DATE}.must_equal "(\"date\" < CURRENT_DATE)"
    @d.l{num < Math::PI.to_i}.must_equal "(\"num\" < 3)"
  end
  
  it "should have operator methods defined that produce Sequel expression objects" do
    @d.l{|o| o.&({:a=>1}, :b)}.must_equal '(("a" = 1) AND "b")'
    @d.l{|o| o.|({:a=>1}, :b)}.must_equal '(("a" = 1) OR "b")'
    @d.l{|o| o.+(1, :b) > 2}.must_equal '((1 + "b") > 2)'
    @d.l{|o| o.-(1, :b) < 2}.must_equal '((1 - "b") < 2)'
    @d.l{|o| o.*(1, :b) >= 2}.must_equal '((1 * "b") >= 2)'
    @d.l{|o| o.**(1, :b) >= 2}.must_equal '(power(1, "b") >= 2)'
    @d.l{|o| o./(1, :b) <= 2}.must_equal '((1 / "b") <= 2)'
    @d.l{|o| o.~(:a=>1)}.must_equal '("a" != 1)'
    @d.l{|o| o.~([[:a, 1], [:b, 2]])}.must_equal '(("a" != 1) OR ("b" != 2))'
    @d.l{|o| o.<(1, :b)}.must_equal '(1 < "b")'
    @d.l{|o| o.>(1, :b)}.must_equal '(1 > "b")'
    @d.l{|o| o.<=(1, :b)}.must_equal '(1 <= "b")'
    @d.l{|o| o.>=(1, :b)}.must_equal '(1 >= "b")'
  end
end

describe "Sequel core extension replacements" do
  before do
    @db = Sequel.mock
    @ds = @db.dataset.with_extend{def supports_regexp?; true end}
    @o = Object.new
    def @o.sql_literal(ds) 'foo' end
  end

  def l(arg, should)
    @ds.literal(arg).must_equal should
  end

  it "Sequel.expr should return items wrapped in Sequel objects" do
    Sequel.expr(1).must_be_kind_of(Sequel::SQL::NumericExpression)
    Sequel.expr('a').must_be_kind_of(Sequel::SQL::StringExpression)
    Sequel.expr(true).must_be_kind_of(Sequel::SQL::BooleanExpression)
    Sequel.expr(nil).must_be_kind_of(Sequel::SQL::Wrapper)
    Sequel.expr({1=>2}).must_be_kind_of(Sequel::SQL::BooleanExpression)
    Sequel.expr([[1, 2]]).must_be_kind_of(Sequel::SQL::BooleanExpression)
    Sequel.expr([1]).must_be_kind_of(Sequel::SQL::Wrapper)
    Sequel.expr{|o| o.a}.must_be_kind_of(Sequel::SQL::Identifier)
    Sequel.expr{a}.must_be_kind_of(Sequel::SQL::Identifier)
    Sequel.expr(:a).must_be_kind_of(Sequel::SQL::Identifier)
  end

  with_symbol_splitting "Sequel.expr should return items wrapped in Sequel objects for splittable symbols" do
    Sequel.expr(:a__b).must_be_kind_of(Sequel::SQL::QualifiedIdentifier)
    Sequel.expr(:a___c).must_be_kind_of(Sequel::SQL::AliasedExpression)
    Sequel.expr(:a___c).expression.must_be_kind_of(Sequel::SQL::Identifier)
    Sequel.expr(:a__b___c).must_be_kind_of(Sequel::SQL::AliasedExpression)
    Sequel.expr(:a__b___c).expression.must_be_kind_of(Sequel::SQL::QualifiedIdentifier)
  end

  it "Sequel.expr should return an appropriate wrapped object" do
    l(Sequel.expr(1) + 1, "(1 + 1)")
    l(Sequel.expr('a') + 'b', "('a' || 'b')")
    l(Sequel.expr(:b) & nil, "(b AND NULL)")
    l(Sequel.expr(nil) & true, "(NULL AND 't')")
    l(Sequel.expr(false) & true, "('f' AND 't')")
    l(Sequel.expr(true) | false, "('t' OR 'f')")
    l(Sequel.expr(@o) + 1, "(foo + 1)")
  end

  it "Sequel.expr should handle condition specifiers" do
    l(Sequel.expr(:a=>1) & nil, "((a = 1) AND NULL)")
    l(Sequel.expr([[:a, 1]]) & nil, "((a = 1) AND NULL)")
    l(Sequel.expr([[:a, 1], [:b, 2]]) & nil, "((a = 1) AND (b = 2) AND NULL)")
  end

  it "Sequel.expr should handle arrays that are not condition specifiers" do
    l(Sequel.expr([1]), "(1)")
    l(Sequel.expr([1, 2]), "(1, 2)")
  end

  it "Sequel.expr should treat blocks/procs as virtual rows and wrap the output" do
    l(Sequel.expr{1} + 1, "(1 + 1)")
    l(Sequel.expr{o[a]} + 1, "(o.a + 1)")
    l(Sequel.expr{[[:a, 1]]} & nil, "((a = 1) AND NULL)")
    l(Sequel.expr{|v| @o} + 1, "(foo + 1)")

    l(Sequel.expr(proc{1}) + 1, "(1 + 1)")
    l(Sequel.expr(proc{o[a]}) + 1, "(o.a + 1)")
    l(Sequel.expr(proc{[[:a, 1]]}) & nil, "((a = 1) AND NULL)")
    l(Sequel.expr(proc{|v| @o}) + 1, "(foo + 1)")
  end

  it "Sequel.expr should handle lambda proc virtual rows" do
    l(Sequel.expr(&lambda{1}), "1")
    l(Sequel.expr(&lambda{|| 1}), "1")
  end

  it "Sequel.expr should raise an error if given an argument and a block" do
    proc{Sequel.expr(nil){}}.must_raise(Sequel::Error)
  end

  it "Sequel.expr should raise an error if given neither an argument nor a block" do
    proc{Sequel.expr}.must_raise(Sequel::Error)
  end

  it "Sequel.expr should return existing Sequel expressions directly" do
    o = Sequel.expr(1)
    Sequel.expr(o).must_be_same_as(o)
    o = Sequel.lit('1')
    Sequel.expr(o).must_be_same_as(o)
  end

  it "Sequel.~ should invert the given object" do
    l(Sequel.~(nil), 'NOT NULL')
    l(Sequel.~(:a=>1), "(a != 1)")
    l(Sequel.~([[:a, 1]]), "(a != 1)")
    l(Sequel.~([[:a, 1], [:b, 2]]), "((a != 1) OR (b != 2))")
    l(Sequel.~(Sequel.expr([[:a, 1], [:b, 2]]) & nil), "((a != 1) OR (b != 2) OR NOT NULL)")
  end

  it "Sequel.case should use a CASE expression" do
    l(Sequel.case({:a=>1}, 2), "(CASE WHEN a THEN 1 ELSE 2 END)")
    l(Sequel.case({:a=>1}, 2, :b), "(CASE b WHEN a THEN 1 ELSE 2 END)")
    l(Sequel.case([[:a, 1]], 2), "(CASE WHEN a THEN 1 ELSE 2 END)")
    l(Sequel.case([[:a, 1]], 2, :b), "(CASE b WHEN a THEN 1 ELSE 2 END)")
    l(Sequel.case([[:a, 1], [:c, 3]], 2), "(CASE WHEN a THEN 1 WHEN c THEN 3 ELSE 2 END)")
    l(Sequel.case([[:a, 1], [:c, 3]], 2, :b), "(CASE b WHEN a THEN 1 WHEN c THEN 3 ELSE 2 END)")
  end

  it "Sequel.case should raise an error if not given a condition specifier" do
    proc{Sequel.case(1, 2)}.must_raise(Sequel::Error)
  end

  it "Sequel.value_list should use an SQL value list" do
    l(Sequel.value_list([[1, 2]]), "((1, 2))")
  end

  it "Sequel.value_list raise an error if not given an array" do
    proc{Sequel.value_list(1)}.must_raise(Sequel::Error)
  end

  it "Sequel.negate should negate all entries in conditions specifier and join with AND" do
    l(Sequel.negate(:a=>1), "(a != 1)")
    l(Sequel.negate([[:a, 1]]), "(a != 1)")
    l(Sequel.negate([[:a, 1], [:b, 2]]), "((a != 1) AND (b != 2))")
  end

  it "Sequel.negate should raise an error if not given a conditions specifier" do
    proc{Sequel.negate(1)}.must_raise(Sequel::Error)
  end

  it "Sequel.or should join all entries in conditions specifier with OR" do
    l(Sequel.or(:a=>1), "(a = 1)")
    l(Sequel.or([[:a, 1]]), "(a = 1)")
    l(Sequel.or([[:a, 1], [:b, 2]]), "((a = 1) OR (b = 2))")
  end

  it "Sequel.or should raise an error if not given a conditions specifier" do
    proc{Sequel.or(1)}.must_raise(Sequel::Error)
  end

  it "Sequel.join should should use SQL string concatenation to join array" do
    l(Sequel.join([]), "''")
    l(Sequel.join(['a']), "('a')")
    l(Sequel.join(['a', 'b']), "('a' || 'b')")
    l(Sequel.join(['a', 'b'], 'c'), "('a' || 'c' || 'b')")
    l(Sequel.join([true, :b], :c), "('t' || c || b)")
    l(Sequel.join([false, nil], Sequel.lit('c')), "('f' || c || NULL)")
    l(Sequel.join([Sequel.expr('a'), Sequel.lit('d')], 'c'), "('a' || 'c' || d)")
  end

  it "Sequel.join should raise an error if not given an array" do
    proc{Sequel.join(1)}.must_raise(Sequel::Error)
  end

  it "Sequel.& should join all arguments given with AND" do
    l(Sequel.&(:a), "a")
    l(Sequel.&(:a, :b=>:c), "(a AND (b = c))")
    l(Sequel.&(:a, {:b=>:c}, Sequel.lit('d')), "(a AND (b = c) AND d)")
  end

  it "Sequel.& should raise an error if given no arguments" do
    proc{Sequel.&}.must_raise(Sequel::Error)
  end

  it "Sequel.| should join all arguments given with OR" do
    l(Sequel.|(:a), "a")
    l(Sequel.|(:a, :b=>:c), "(a OR (b = c))")
    l(Sequel.|(:a, {:b=>:c}, Sequel.lit('d')), "(a OR (b = c) OR d)")
  end

  it "Sequel.| should raise an error if given no arguments" do
    proc{Sequel.|}.must_raise(Sequel::Error)
  end

  it "Sequel.as should return an aliased expression" do
    l(Sequel.as(:a, :b), "a AS b")
  end

  it "Sequel.cast should return a CAST expression" do
    l(Sequel.cast(:a, :int), "CAST(a AS int)")
    l(Sequel.cast(:a, Integer), "CAST(a AS integer)")
  end

  it "Sequel.cast_numeric should return a CAST expression treated as a number" do
    l(Sequel.cast_numeric(:a), "CAST(a AS integer)")
    l(Sequel.cast_numeric(:a, :int), "CAST(a AS int)")
    l(Sequel.cast_numeric(:a) << 2, "(CAST(a AS integer) << 2)")
  end

  it "Sequel.cast_string should return a CAST expression treated as a string" do
    l(Sequel.cast_string(:a), "CAST(a AS varchar(255))")
    l(Sequel.cast_string(:a, :text), "CAST(a AS text)")
    l(Sequel.cast_string(:a) + 'a', "(CAST(a AS varchar(255)) || 'a')")
  end

  it "Sequel.lit should return a literal string" do
    l(Sequel.lit('a'), "a")
  end

  it "Sequel.lit should return the argument if given a single literal string" do
    o = Sequel.lit('a')
    Sequel.lit(o).must_be_same_as(o)
  end

  it "Sequel.lit should accept multiple arguments for a placeholder literal string" do
    l(Sequel.lit('a = ?', 1), "a = 1")
    l(Sequel.lit('? = ?', :a, 1), "a = 1")
    l(Sequel.lit('a = :a', :a=>1), "a = 1")
  end

  it "Sequel.lit should work with an array for the placeholder string" do
    l(Sequel.lit(['a = '], 1), "a = 1")
    l(Sequel.lit(['', ' = '], :a, 1), "a = 1")
  end

  it "Sequel.blob should return an SQL::Blob" do
    l(Sequel.blob('a'), "'a'")
    Sequel.blob('a').must_be_kind_of(Sequel::SQL::Blob)
  end

  it "Sequel.blob should return the given argument if given a blob" do
    o = Sequel.blob('a')
    Sequel.blob(o).must_be_same_as(o)
  end

  it "Sequel.blob#inspect output should indicate it is a blob and the size" do
    o = Sequel.blob('a')
    o.inspect.must_equal "#<Sequel::SQL::Blob:0x#{'%x' % o.object_id} bytes=1 content=\"a\">"
    o = Sequel.blob(('a'..'z').to_a.join)
    o.inspect.must_equal "#<Sequel::SQL::Blob:0x#{'%x' % o.object_id} bytes=26 start=\"abcdefghij\" end=\"qrstuvwxyz\">"
    o = Sequel.blob(255.chr)
    o.inspect.must_equal "#<Sequel::SQL::Blob:0x#{'%x' % o.object_id} bytes=1 content=\"\\xFF\">"
    o = Sequel.blob((230..255).map(&:chr).join)
    o.inspect.must_equal "#<Sequel::SQL::Blob:0x#{'%x' % o.object_id} bytes=26 start=\"\\xE6\\xE7\\xE8\\xE9\\xEA\\xEB\\xEC\\xED\\xEE\\xEF\" end=\"\\xF6\\xF7\\xF8\\xF9\\xFA\\xFB\\xFC\\xFD\\xFE\\xFF\">"
  end

  it "Sequel.deep_qualify should do a deep qualification into nested structors" do
    l(Sequel.deep_qualify(:t, Sequel.+(:c, 1)), "(t.c + 1)")
  end

  it "Sequel.qualify should return a qualified identifier" do
    l(Sequel.qualify(:t, :c), "t.c")
  end

  it "Sequel::SQL::Identifier#[] should return a qualified identifier" do
    l(Sequel[:t][:c], "t.c")
  end

  it "Sequel::SQL::QualifiedIdentifier#[] should return a nested qualified identifier" do
    l(Sequel[:s][:t][:c], "s.t.c")
  end

  it "Sequel.identifier should return an identifier" do
    l(Sequel.identifier(:t__c), "t__c")
  end

  it "Sequel.asc should return an ASC ordered expression" do
    l(Sequel.asc(:a), "a ASC")
    l(Sequel.asc(:a, :nulls=>:first), "a ASC NULLS FIRST")
  end

  it "Sequel.desc should return a DESC ordered expression " do
    l(Sequel.desc(:a), "a DESC")
    l(Sequel.desc(:a, :nulls=>:last), "a DESC NULLS LAST")
  end

  it "Sequel.{+,-,*,/} should accept arguments and use the appropriate operator" do
    %w'+ - * /'.each do |op|
      l(Sequel.send(op, 1), '1')
      l(Sequel.send(op, 1, 2), "(1 #{op} 2)")
      l(Sequel.send(op, 1, 2, 3), "(1 #{op} 2 #{op} 3)")
    end
  end

  it "Sequel.{+,-,*,/} should raise if given no arguments" do
    %w'+ - * /'.each do |op|
      proc{Sequel.send(op)}.must_raise(Sequel::Error)
    end
  end

  it "Sequel.** should use power function if given 2 arguments" do
    l(Sequel.**(1, 2), 'power(1, 2)')
  end

  it "Sequel.** should raise if not given 2 arguments" do
    proc{Sequel.**}.must_raise(ArgumentError)
    proc{Sequel.**(1)}.must_raise(ArgumentError)
    proc{Sequel.**(1, 2, 3)}.must_raise(ArgumentError)
  end

  it "Sequel.like should use a LIKE expression" do
    l(Sequel.like('a', 'b'), "('a' LIKE 'b' ESCAPE '\\')")
    l(Sequel.like(:a, :b), "(a LIKE b ESCAPE '\\')")
    l(Sequel.like(:a, /b/), "(a ~ 'b')")
    l(Sequel.like(:a, 'c', /b/), "((a LIKE 'c' ESCAPE '\\') OR (a ~ 'b'))")
  end

  it "Sequel.ilike should use an ILIKE expression" do
    l(Sequel.ilike('a', 'b'), "(UPPER('a') LIKE UPPER('b') ESCAPE '\\')")
    l(Sequel.ilike(:a, :b), "(UPPER(a) LIKE UPPER(b) ESCAPE '\\')")
    l(Sequel.ilike(:a, /b/), "(a ~* 'b')")
    l(Sequel.ilike(:a, 'c', /b/), "((UPPER(a) LIKE UPPER('c') ESCAPE '\\') OR (a ~* 'b'))")
  end

  it "Sequel.subscript should use an SQL subscript" do
    l(Sequel.subscript(:a, 1), 'a[1]')
    l(Sequel.subscript(:a, 1, 2), 'a[1, 2]')
    l(Sequel.subscript(:a, [1, 2]), 'a[1, 2]')
    l(Sequel.subscript(:a, 1..2), 'a[1:2]')
    l(Sequel.subscript(:a, 1...3), 'a[1:2]')
  end

  it "Sequel.subscript.f should be subscript expression for backwards compatibility" do
    Sequel.subscript(:a, 1).f.must_equal :a
  end

  it "Sequel.function should return an SQL function" do
    l(Sequel.function(:a), 'a()')
    l(Sequel.function(:a, 1), 'a(1)')
    l(Sequel.function(:a, :b, 2), 'a(b, 2)')
  end

  it "Sequel.extract should use a date/time extraction" do
    l(Sequel.extract(:year, :a), 'extract(year FROM a)')
  end

  it "#* with no arguments should use a ColumnAll for Identifier and QualifiedIdentifier" do
    l(Sequel.expr(:a).*, 'a.*')
    l(Sequel[:a][:b].*, 'a.b.*')
  end

  it "SQL::Blob should be aliasable and castable by default" do
    b = Sequel.blob('a')
    l(b.as(:a), "'a' AS a")
    l(b.cast(Integer), "CAST('a' AS integer)")
  end

  it "SQL::Blob should be convertable to a literal string by default" do
    b = Sequel.blob('a ?')
    l(b.lit, "a ?")
    l(b.lit(1), "a 1")
  end
end

describe "Sequel::SQL::Function#==" do
  it "should be true for functions with the same name and arguments, false otherwise" do
    a = Sequel.function(:date, :t)
    b = Sequel.function(:date, :t)
    a.must_equal b
    (a == b).must_equal true
    c = Sequel.function(:date, :c)
    a.wont_equal c
    (a == c).must_equal false
    d = Sequel.function(:time, :c)
    a.wont_equal d
    c.wont_equal d
    (a == d).must_equal false
    (c == d).must_equal false
  end
end

describe "Sequel::SQL::OrderedExpression" do
  it "should #desc" do
    @oe = Sequel.asc(:column)
    @oe.descending.must_equal false
    @oe.desc.descending.must_equal true
  end

  it "should #asc" do
    @oe = Sequel.desc(:column)
    @oe.descending.must_equal true
    @oe.asc.descending.must_equal false
  end

  it "should #invert" do
    @oe = Sequel.desc(:column)
    @oe.invert.descending.must_equal false
    @oe.invert.invert.descending.must_equal true
  end
end

describe "Expression" do
  it "should consider objects == only if they have the same attributes" do
    Sequel.qualify(:table, :column).cast(:type).*(:numeric_column).asc.must_equal Sequel.qualify(:table, :column).cast(:type).*(:numeric_column).asc
    Sequel.qualify(:table, :other_column).cast(:type).*(:numeric_column).asc.wont_equal Sequel.qualify(:table, :column).cast(:type).*(:numeric_column).asc

    Sequel.qualify(:table, :column).cast(:type).*(:numeric_column).asc.must_equal(Sequel.qualify(:table, :column).cast(:type).*(:numeric_column).asc)
    Sequel.qualify(:table, :other_column).cast(:type).*(:numeric_column).asc.wont_equal(Sequel.qualify(:table, :column).cast(:type).*(:numeric_column).asc)
  end

  it "should use the same hash value for objects that have the same attributes" do
    Sequel.qualify(:table, :column).cast(:type).*(:numeric_column).asc.hash.must_equal Sequel.qualify(:table, :column).cast(:type).*(:numeric_column).asc.hash
    Sequel.qualify(:table, :other_column).cast(:type).*(:numeric_column).asc.hash.wont_equal Sequel.qualify(:table, :column).cast(:type).*(:numeric_column).asc.hash

    h = {}
    a = Sequel.qualify(:table, :column).cast(:type).*(:numeric_column).asc
    b = Sequel.qualify(:table, :column).cast(:type).*(:numeric_column).asc
    h[a] = 1
    h[b] = 2
    h[a].must_equal 2
    h[b].must_equal 2
  end
end

describe "Sequel::SQLTime" do
  before do
    @db = Sequel.mock
  end
  after do
    Sequel::application_timezone = Sequel::SQLTime.date = nil
  end

  it ".create should create from hour, minutes, seconds and optional microseconds" do
    @db.literal(Sequel::SQLTime.create(1, 2, 3)).must_equal "'01:02:03.000000'"
    @db.literal(Sequel::SQLTime.create(1, 2, 3, 500000)).must_equal "'01:02:03.500000'"
  end

  it ".create should use utc is that is the application_timezone setting" do
    Sequel::SQLTime.create(1, 2, 3).utc?.must_equal false
    Sequel::application_timezone = :local
    Sequel::SQLTime.create(1, 2, 3).utc?.must_equal false
    Sequel::application_timezone = :utc
    Sequel::SQLTime.create(1, 2, 3).utc?.must_equal true
  end

  it ".create should use today's date by default" do
    Sequel::SQLTime.create(1, 2, 3).strftime('%Y-%m-%d').must_equal Date.today.strftime('%Y-%m-%d')
  end

  it ".create should use specific date if set" do
    Sequel::SQLTime.date = Date.new(2000)
    Sequel::SQLTime.create(1, 2, 3).strftime('%Y-%m-%d').must_equal Date.new(2000).strftime('%Y-%m-%d')
  end

  it ".parse should respect SQLTime.date setting" do
    Sequel::SQLTime.date = Date.new(2000, 2, 3)
    Sequel::SQLTime.parse('10:11:12').strftime('%F').must_equal "2000-02-03"
  end

  it ".parse should respect application_timezone setting" do
    Sequel::application_timezone = :utc
    Sequel::SQLTime.parse('10:11:12').utc_offset.must_equal 0
  end

  it "#inspect should show class and time by default" do
    Sequel::SQLTime.create(1, 2, 3).inspect.must_equal "#<Sequel::SQLTime 01:02:03>"
    Sequel::SQLTime.create(13, 24, 35).inspect.must_equal "#<Sequel::SQLTime 13:24:35>"
  end

  it "#to_s should include hour, minute, and second by default" do
    Sequel::SQLTime.create(1, 2, 3).to_s.must_equal "01:02:03"
    Sequel::SQLTime.create(1, 2, 3, 500000).to_s.must_equal "01:02:03"
  end

  it "#to_s should handle arguments with super" do
    t = Sequel::SQLTime.create(1, 2, 3)
    begin
      Time.now.to_s('%F')
    rescue
      proc{t.to_s('%F')}.must_raise ArgumentError
    else
      t.to_s('%F')
    end
  end
end

describe "Sequel::SQL::Wrapper" do
  before do
    @ds = Sequel.mock.dataset
  end

  it "should wrap objects so they can be used by the Sequel DSL" do
    o = Object.new
    def o.sql_literal(ds) 'foo' end
    s = Sequel::SQL::Wrapper.new(o)
    @ds.literal(s).must_equal "foo"
    @ds.literal(s+1).must_equal "(foo + 1)"
    @ds.literal(s**1).must_equal "power(foo, 1)"
    @ds.literal(s & true).must_equal "(foo AND 't')"
    @ds.literal(s < 1).must_equal "(foo < 1)"
    @ds.literal(s.sql_subscript(1)).must_equal "(foo)[1]"
    @ds.literal(s.like('a')).must_equal "(foo LIKE 'a' ESCAPE '\\')"
    @ds.literal(s.as(:a)).must_equal "foo AS a"
    @ds.literal(s.cast(Integer)).must_equal "CAST(foo AS integer)"
    @ds.literal(s.desc).must_equal "foo DESC"
    @ds.literal(s.sql_string + '1').must_equal "(foo || '1')"
  end
end

describe "Sequel::SQL::Blob" do
  it ".call should be an alias for .new" do
    Sequel::SQL::Blob.call('a').must_equal Sequel::SQL::Blob.new('a')
  end

  it "#to_sequel_blob should return self" do
    c = Sequel::SQL::Blob.new('a')
    c.to_sequel_blob.must_be_same_as(c)
  end
end

describe Sequel::SQL::Subscript do
  before do
    @s = Sequel::SQL::Subscript.new(:a, [1])
    @ds = Sequel.mock.dataset
  end

  it "should have | return a new non-nested subscript" do
    s = (@s | 2)
    @ds.literal(s).must_equal 'a[1, 2]'
  end

  it "should have [] return a new nested subscript" do
    s = @s[2]
    @ds.literal(s).must_equal 'a[1][2]'
  end

  it "should not wrap identifiers in parentheses" do
    @ds.literal(Sequel::SQL::Subscript.new(:a, [1])).must_equal 'a[1]'
    @ds.literal(Sequel::SQL::Subscript.new(Sequel[:a], [1])).must_equal 'a[1]'
    @ds.literal(Sequel::SQL::Subscript.new(Sequel[:a][:b], [1])).must_equal 'a.b[1]'
  end

  it "should wrap other expression types in parentheses" do
    @ds.literal(Sequel::SQL::Subscript.new(Sequel.function('a'), [1])).must_equal '(a())[1]'
    @ds.literal(Sequel::SQL::Subscript.new(Sequel.lit('a'), [1])).must_equal '(a)[1]'
    @ds.literal(Sequel::SQL::Subscript.new(Sequel.lit('a(?)', 2), [1])).must_equal '(a(2))[1]'
  end
end

describe Sequel::SQL::CaseExpression, "#with_merged_expression" do
  it "should return self if it has no expression" do
    c = Sequel.case({1=>0}, 3)
    c.with_merged_expression.must_be_same_as(c)
  end

  it "should merge expression into conditions if it has an expression" do
    db = Sequel::Database.new
    c = Sequel.case({1=>0}, 3, 4)
    db.literal(c.with_merged_expression).must_equal db.literal(Sequel.case({{4=>1}=>0}, 3))
  end
end

describe "Sequel.recursive_map" do
  it "should recursively convert an array using a callable" do
    Sequel.recursive_map(['1'], proc{|s| s.to_i}).must_equal [1]
    Sequel.recursive_map([['1']], proc{|s| s.to_i}).must_equal [[1]]
  end

  it "should not call callable if value is nil" do
    Sequel.recursive_map([nil], proc{|s| s.to_i}).must_equal [nil]
    Sequel.recursive_map([[nil]], proc{|s| s.to_i}).must_equal [[nil]]
  end
  
  it "should call callable for falsey value" do 
    Sequel.recursive_map([false], proc{|s| s.to_s}).must_equal ['false']  
    Sequel.recursive_map([[false]], proc{|s| s.to_s}).must_equal [['false']]  
  end
end

describe "Sequel.delay" do
  before do
    @o = Class.new do
      def a
        @a ||= 0
        @a += 1
      end
      def _a
        @a if defined?(@a)
      end

      attr_accessor :b
    end.new
  end

  it "should delay calling the block until literalization" do
    ds = Sequel.mock[:b].where(:a=>Sequel.delay{@o.a})
    @o._a.must_be_nil
    ds.sql.must_equal "SELECT * FROM b WHERE (a = 1)"
    @o._a.must_equal 1
    ds.sql.must_equal "SELECT * FROM b WHERE (a = 2)"
    @o._a.must_equal 2
  end

  it "should call the block with the current dataset if it accepts one argument" do
    ds = Sequel.mock[:b].where(Sequel.delay{|x| x.first_source})
    ds.sql.must_equal "SELECT * FROM b WHERE b"
    ds.from(:c).sql.must_equal "SELECT * FROM c WHERE c"
  end

  it "should have the condition specifier handling respect delayed evaluations" do
    ds = Sequel.mock[:b].where(:a=>Sequel.delay{@o.b})
    ds.sql.must_equal "SELECT * FROM b WHERE (a IS NULL)"
    @o.b = 1
    ds.sql.must_equal "SELECT * FROM b WHERE (a = 1)"
    @o.b = [1, 2]
    ds.sql.must_equal "SELECT * FROM b WHERE (a IN (1, 2))"
  end

  it "should have the condition specifier handling call block with the current dataset if it accepts one argument" do
    ds = Sequel.mock[:b].where(:a=>Sequel.delay{|x| x.first_source})
    ds.sql.must_equal "SELECT * FROM b WHERE (a = b)"
    ds.from(:c).sql.must_equal "SELECT * FROM c WHERE (a = c)"
  end

  it "should raise if called without a block" do
    proc{Sequel.delay}.must_raise(Sequel::Error)
  end
end

describe Sequel do
  before do
    Sequel::JSON = Class.new do
      self::ParserError = Sequel
      def self.parse(json, opts={})
        [json, opts]
      end
    end
  end
  after do
    Sequel.send(:remove_const, :JSON)
  end

  it ".parse_json should parse json correctly" do
    Sequel.parse_json('[]').must_equal ['[]', {:create_additions=>false}]
  end

  it ".json_parser_error_class should return the related parser error class" do
    Sequel.json_parser_error_class.must_equal Sequel
  end

  it ".object_to_json should return a json version of the object" do
    o = Object.new
    def o.to_json(*args); [1, args]; end
    Sequel.object_to_json(o, :foo).must_equal [1, [:foo]]
  end
end

describe "Sequel::LiteralString" do
  before do
    @s = Sequel::LiteralString.new("? = ?")
  end

  it "should have lit return self if no arguments" do
    @s.lit.must_be_same_as(@s)
  end

  it "should have lit return self if return a placeholder literal string if arguments" do
    @s.lit(1, 2).must_be_kind_of(Sequel::SQL::PlaceholderLiteralString)
    Sequel.mock.literal(@s.lit(1, :a)).must_equal '1 = a'
  end

  it "should have to_sequel_blob convert to blob" do
    @s.to_sequel_blob.must_equal @s
    @s.to_sequel_blob.must_be_kind_of(Sequel::SQL::Blob)
  end
end

describe "Sequel core extensions" do
  it "should have Sequel.core_extensions? be false by default" do
    Sequel.core_extensions?.must_equal false
  end
end
