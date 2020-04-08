require "testunit-test-util"

class TestData < Test::Unit::TestCase
  class Calc
    def initialize
    end

    def plus(augend, addend)
      augend + addend
    end
  end

  class TestCalc < Test::Unit::TestCase
    @@testing = false

    class << self
      def testing=(testing)
        @@testing = testing
      end
    end

    def valid?
      @@testing
    end

    def setup
      @calc = Calc.new
    end

    class TestDataSet < TestCalc
      data("positive positive" => {:expected => 4, :augend => 3, :addend => 1},
           "positive negative" => {:expected => -1, :augend => 1, :addend => -2})
      def test_plus(data)
        assert_equal(data[:expected],
                     @calc.plus(data[:augend], data[:addend]))
      end
    end

    class TestNData < TestCalc
      data("positive positive", {:expected => 4, :augend => 3, :addend => 1})
      data("positive negative", {:expected => -1, :augend => 1, :addend => -2})
      def test_plus(data)
        assert_equal(data[:expected],
                     @calc.plus(data[:augend], data[:addend]))
      end
    end

    class TestDynamicDataSet < TestCalc
      data do
        data_set = {}
        data_set["positive positive"] = {
          :expected => 3,
          :augend => 1,
          :addend => 2
        }
        data_set["positive negative"] = {
          :expected => -1,
          :augend => 1,
          :addend => -2
        }
        data_set
      end
      DATA_PROC = current_attribute(:data)[:value].first
      def test_plus(data)
        assert_equal(data[:expected],
                     @calc.plus(data[:augend], data[:addend]))
      end
    end

    class TestLoadDataSet < TestCalc
      extend TestUnitTestUtil
      load_data(fixture_file_path("plus.csv"))
      def test_plus(data)
        assert_equal(data["expected"],
                     @calc.plus(data["augend"], data["addend"]))
      end
    end

    class TestSuperclass < TestCalc
      data("positive positive" => {:expected => 4, :augend => 3, :addend => 1},
           "positive negative" => {:expected => -1, :augend => 1, :addend => -2})
      def test_plus(data)
        assert_equal(data[:expected],
                     @calc.plus(data[:augend], data[:addend]))
      end

      class TestNormalTestInSubclass < self
        def test_plus
          assert_equal(2, @calc.plus(1, 1))
        end
      end
    end
  end

  def setup
    TestCalc.testing = true
  end

  def teardown
    TestCalc.testing = false
  end

  def test_data_no_arguments_without_block
    assert_raise(ArgumentError) do
      self.class.data
    end
  end

  data("data set",
       {
         :test_case => TestCalc::TestDataSet,
         :data_set => [{
                         "positive positive" => {
                           :expected => 4,
                           :augend => 3,
                           :addend => 1,
                         },
                         "positive negative" => {
                           :expected => -1,
                           :augend => 1,
                           :addend => -2,
                         },
                       }],
       })
  data("n-data",
       {
         :test_case => TestCalc::TestNData,
         :data_set => [{
                         "positive positive" => {
                           :expected => 4,
                           :augend => 3,
                           :addend => 1,
                         },
                       },
                       {
                         "positive negative" => {
                           :expected => -1,
                           :augend => 1,
                           :addend => -2,
                         },
                       }],
       })
  data("dynamic-data-set",
       {
         :test_case => TestCalc::TestDynamicDataSet,
         :data_set => [TestCalc::TestDynamicDataSet::DATA_PROC],
       })
  data("load-data-set",
       {
         :test_case => TestCalc::TestLoadDataSet,
         :data_set => [{
                         "positive positive" => {
                           "expected" => 4,
                           "augend" => 3,
                           "addend" => 1,
                         },
                       },
                       {
                         "positive negative" => {
                           "expected" => -1,
                           "augend" => 1,
                           "addend" => -2,
                         },
                       }],
         })
  def test_data(data)
    test_plus = data[:test_case].new("test_plus")
    assert_equal(data[:data_set], test_plus[:data])
    assert_not_nil(data[:data_set])
  end

  data("data set"         => TestCalc::TestDataSet,
       "n-data"           => TestCalc::TestNData,
       "dynamic-data-set" => TestCalc::TestDynamicDataSet,
       "load-data-set"    => TestCalc::TestLoadDataSet)
  def test_suite(test_case)
    suite = test_case.suite
    assert_equal(["test_plus[positive negative](#{test_case.name})",
                  "test_plus[positive positive](#{test_case.name})"],
                 suite.tests.collect {|test| test.name}.sort)
  end

  data("data set"         => TestCalc::TestDataSet,
       "n-data"           => TestCalc::TestNData,
       "dynamic-data-set" => TestCalc::TestDynamicDataSet,
       "load-data-set"    => TestCalc::TestLoadDataSet,
       "superclass"       => TestCalc::TestSuperclass)
  def test_run(test_case)
    result = _run_test(test_case)
    assert_equal("2 tests, 2 assertions, 0 failures, 0 errors, 0 pendings, " \
                 "0 omissions, 0 notifications", result.to_s)
  end

  def test_run_normal_test_in_subclass
    result = _run_test(TestCalc::TestSuperclass::TestNormalTestInSubclass)
    assert_equal("1 tests, 1 assertions, 0 failures, 0 errors, 0 pendings, " \
                 "0 omissions, 0 notifications", result.to_s)
  end

  data("data set"         => TestCalc::TestDataSet,
       "n-data"           => TestCalc::TestNData,
       "dynamic-data-set" => TestCalc::TestDynamicDataSet,
       "load-data-set"    => TestCalc::TestLoadDataSet)
  def test_equal(test_case)
    suite = test_case.suite
    positive_positive_test = suite.tests.find do |test|
      test.data_label == "positive positive"
    end
    suite.tests.delete(positive_positive_test)
    assert_equal(["test_plus[positive negative](#{test_case.name})"],
                 suite.tests.collect {|test| test.name}.sort)
  end

  data("true"    => {:expected => true,    :target => "true"},
       "false"   => {:expected => false,   :target => "false"},
       "integer" => {:expected => 1,       :target => "1"},
       "float"   => {:expected => 1.5,     :target => "1.5"},
       "string"  => {:expected => "hello", :target => "hello"})
  def test_normalize_value(data)
    loader = Test::Unit::Data::ClassMethods::Loader.new(self)
    assert_equal(data[:expected], loader.__send__(:normalize_value, data[:target]))
  end

  def _run_test(test_case)
    result = Test::Unit::TestResult.new
    test = test_case.suite
    yield(test) if block_given?
    test.run(result) {}
    result
  end

  class TestLoadData < Test::Unit::TestCase
    include TestUnitTestUtil
    def test_invalid_csv_file_name
      garbage = "X"
      file_name = "data.csv#{garbage}"
      assert_raise(ArgumentError, "unsupported file format: <#{file_name}>") do
        self.class.load_data(file_name)
      end
    end

    class TestFileFormat < self
      def setup
        self.class.current_attribute(:data).clear
      end

      class TestHeader < self
        data("csv" => "header.csv",
             "tsv" => "header.tsv")
        def test_normal(file_name)
          self.class.load_data(fixture_file_path(file_name))
          assert_equal([
                         {
                           "empty string" => {
                             "expected" => true,
                             "target"   => ""
                           }
                         },
                         {
                           "plain string" => {
                             "expected" => false,
                             "target"   => "hello"
                           }
                         }
                       ],
                       self.class.current_attribute(:data)[:value])
        end

        data("csv" => "header-label.csv",
             "tsv" => "header-label.tsv")
        def test_label(file_name)
          self.class.load_data(fixture_file_path(file_name))
          assert_equal([
                         {
                           "upper case" => {
                             "expected" => "HELLO",
                             "label"    => "HELLO"
                           }
                         },
                         {
                           "lower case" => {
                             "expected" => "Hello",
                             "label"    => "hello"
                           }
                         }
                       ],
                       self.class.current_attribute(:data)[:value])
        end
      end

      data("csv" => "no-header.csv",
           "tsv" => "no-header.tsv")
      def test_without_header(file_name)
        self.class.load_data(fixture_file_path(file_name))
        assert_equal([
                       {"empty string" => [true, ""]},
                       {"plain string" => [false, "hello"]}
                     ],
                     self.class.current_attribute(:data)[:value])
      end
    end
  end
end
