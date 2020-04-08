require_relative "spec_helper"

describe "Sequel::Plugins::ValidationHelpers" do
  before do
    @c = Class.new(Sequel::Model) do
      def self.set_validations(&block)
        define_method(:validate, &block)
      end
      columns :value
    end
    @c.plugin :validation_helpers
    @m = @c.new
  end

  it "should take an :allow_blank option" do
    @c.set_validations{validates_format(/.+_.+/, :value, :allow_blank=>true)}
    @m.value = 'abc_'
    @m.wont_be :valid?
    @m.value = '1_1'
    @m.must_be :valid?
    o = String.new
    o.singleton_class.send(:undef_method, :blank?)
    @m.value = o
    @m.must_be :valid?
    o = Object.new
    @m.value = o
    @m.wont_be :valid?
    def o.blank?
      true
    end
    @m.must_be :valid?
  end

  it "should take an :allow_missing option" do
    @c.set_validations{validates_format(/.+_.+/, :value, :allow_missing=>true)}
    @m.values.clear
    @m.must_be :valid?
    @m.value = nil
    @m.wont_be :valid?
    @m.value = '1_1'
    @m.must_be :valid?
  end

  it "should take an :allow_nil option" do
    @c.set_validations{validates_format(/.+_.+/, :value, :allow_nil=>true)}
    @m.value = 'abc_'
    @m.wont_be :valid?
    @m.value = '1_1'
    @m.must_be :valid?
    @m.value = nil
    @m.must_be :valid?
  end

  it "should take a :message option" do
    @c.set_validations{validates_format(/.+_.+/, :value, :message=>"is so blah")}
    @m.value = 'abc_'
    @m.wont_be :valid?
    @m.errors.full_messages.must_equal ['value is so blah']
    @m.value = '1_1'
    @m.must_be :valid?
  end
  
  it "should take a :from=>:values option to lookup in values hash" do
    @c.set_validations{validates_max_length(50, :value, :from=>:values)}
    @c.send(:define_method, :value){super() * 2}
    @m.value = ' ' * 26
    @m.must_be :valid?
  end
  
  it "should allow a proc for the :message option" do
    @c.set_validations{validates_format(/.+_.+/, :value, :message=>proc{|f| "doesn't match #{f.inspect}"})}
    @m.value = 'abc_'
    @m.wont_be :valid?
    @m.errors.must_equal(:value=>["doesn't match /.+_.+/"])
  end

  it "should take multiple attributes in the same call" do
    @c.columns :value, :value2
    @c.set_validations{validates_presence([:value, :value2])}
    @m.wont_be :valid?
    @m.value = 1
    @m.wont_be :valid?
    @m.value2 = 1
    @m.must_be :valid?
  end
  
  it "should support modifying default validation options for a particular model" do
    @c.set_validations{validates_presence(:value)}
    @m.wont_be :valid?
    @m.errors.must_equal(:value=>['is not present'])
    @c.class_eval do
      def default_validation_helpers_options(type)
        {:allow_missing=>true, :message=>proc{'was not entered'}}
      end
    end
    @m.value = nil
    @m.wont_be :valid?
    @m.errors.must_equal(:value=>["was not entered"])
    @m.value = 1
    @m.must_be :valid?
    
    @m.values.clear
    @m.must_be :valid?
    
    c = Class.new(Sequel::Model)
    c.class_eval do
      plugin :validation_helpers
      attr_accessor :value
      def validate
        validates_presence(:value)
      end
    end
    m = c.new
    m.wont_be :valid?
    m.errors.must_equal(:value=>['is not present'])
  end

  it "should support validates_exact_length" do
    @c.set_validations{validates_exact_length(3, :value)}
    @m.wont_be :valid?
    @m.value = '123'
    @m.must_be :valid?
    @m.value = '12'
    @m.wont_be :valid?
    @m.value = '1234'
    @m.wont_be :valid?
  end
  
  it "should support validate_format" do
    @c.set_validations{validates_format(/.+_.+/, :value)}
    @m.value = 'abc_'
    @m.wont_be :valid?
    @m.value = 'abc_def'
    @m.must_be :valid?
  end
  
  it "should support validates_includes with an array" do
    @c.set_validations{validates_includes([1,2], :value)}
    @m.wont_be :valid?
    @m.value = 1
    @m.must_be :valid?
    @m.value = 1.5
    @m.wont_be :valid?
    @m.value = 2
    @m.must_be :valid?    
    @m.value = 3
    @m.wont_be :valid? 
  end
  
  it "should support validates_includes with a range" do
    @c.set_validations{validates_includes(1..4, :value)}
    @m.wont_be :valid?
    @m.value = 1
    @m.must_be :valid?
    @m.value = 1.5
    @m.must_be :valid?
    @m.value = 0
    @m.wont_be :valid?
    @m.value = 5
    @m.wont_be :valid?    
  end
  
  it "should supports validates_integer" do
    @c.set_validations{validates_integer(:value)}
    @m.value = 'blah'
    @m.wont_be :valid?
    @m.value = '123'
    @m.must_be :valid?
    @m.value = '123.1231'
    @m.wont_be :valid?
  end
  
  it "should support validates_length_range" do
    @c.set_validations{validates_length_range(2..5, :value)}
    @m.wont_be :valid?
    @m.value = '12345'
    @m.must_be :valid?
    @m.value = '1'
    @m.wont_be :valid?
    @m.value = '123456'
    @m.wont_be :valid?
  end

  it "should support validates_max_length" do
    @c.set_validations{validates_max_length(5, :value)}
    @m.wont_be :valid?
    @m.value = '12345'
    @m.must_be :valid?
    @m.value = '123456'
    @m.wont_be :valid?
    @m.errors[:value].must_equal ['is longer than 5 characters']
    @m.value = nil
    @m.wont_be :valid?
    @m.errors[:value].must_equal ['is not present']
  end

  it "should support validates_max_length with nil value" do
    @c.set_validations{validates_max_length(5, :value, :message=>'tl', :nil_message=>'np')}
    @m.value = '123456'
    @m.wont_be :valid?
    @m.errors[:value].must_equal ['tl']
    @m.value = nil
    @m.wont_be :valid?
    @m.errors[:value].must_equal ['np']
  end

  it "should support validates_min_length" do
    @c.set_validations{validates_min_length(5, :value)}
    @m.wont_be :valid?
    @m.value = '12345'
    @m.must_be :valid?
    @m.value = '1234'
    @m.wont_be :valid?
  end

  it "should support validates_schema_types" do
    @c.set_validations{validates_schema_types}
    @m.value = 123
    @m.must_be :valid?
    @m.value = '123'
    @m.must_be :valid?
    def @m.db_schema; {:value=>{:type=>:integer}} end
    @m.wont_be :valid?
    @m.errors.full_messages.must_equal ['value is not a valid integer']

    @c.set_validations{validates_schema_types(:value)}
    def @m.db_schema; {:value=>{:type=>:integer}} end
    @m.wont_be :valid?
    @m.errors.full_messages.must_equal ['value is not a valid integer']

    @c.set_validations{validates_schema_types(:value, :message=>'is bad')}
    def @m.db_schema; {:value=>{:type=>:integer}} end
    @m.wont_be :valid?
    @m.errors.full_messages.must_equal ['value is bad']
  end

  it "should support validates_numeric" do
    @c.set_validations{validates_numeric(:value)}
    @m.value = 'blah'
    @m.wont_be :valid?
    @m.value = '123'
    @m.must_be :valid?
    @m.value = '123.1231'
    @m.must_be :valid?
    @m.value = '+1'
    @m.must_be :valid?
    @m.value = '-1'
    @m.must_be :valid?
    @m.value = '+1.123'
    @m.must_be :valid?
    @m.value = '-0.123'
    @m.must_be :valid?
    @m.value = '-0.123E10'
    @m.must_be :valid?
    @m.value = '32.123e10'
    @m.must_be :valid?
    @m.value = '+32.123E10'
    @m.must_be :valid?
    @m.must_be :valid?
    @m.value = '.0123'
  end
  
  it "should support validates_type" do
    @c.set_validations{validates_type(Integer, :value)}
    @m.value = 123
    @m.must_be :valid?
    @m.value = '123'
    @m.wont_be :valid?
    @m.errors.full_messages.must_equal ['value is not a valid integer']
    
    @c.set_validations{validates_type(:String, :value)}
    @m.value = '123'
    @m.must_be :valid?
    @m.value = 123
    @m.wont_be :valid?
    @m.errors.full_messages.must_equal ['value is not a valid string']
    
    @c.set_validations{validates_type('Integer', :value)}
    @m.value = 123
    @m.must_be :valid?
    @m.value = 123.05
    @m.wont_be :valid?
    @m.errors.full_messages.must_equal ['value is not a valid integer']
    
    @c.set_validations{validates_type(Integer, :value)}
    @m.value = 1
    @m.must_be :valid?
    @m.value = false
    @m.wont_be :valid?
    
    @c.set_validations{validates_type([Integer, Float], :value)}
    @m.value = 1
    @m.must_be :valid?
    @m.value = 1.0
    @m.must_be :valid?
    @m.value = BigDecimal('1.0')
    @m.wont_be :valid?
    @m.errors.full_messages.must_equal ['value is not a valid integer or float']
  end

  it "should support validates_not_null" do
    @c.set_validations{validates_not_null(:value)}
    @m.wont_be :valid?
    @m.value = ''
    @m.must_be :valid?
    @m.value = 1234
    @m.must_be :valid?
    @m.value = nil
    @m.wont_be :valid?
    @m.value = true
    @m.must_be :valid?
    @m.value = false
    @m.must_be :valid?
    @m.value = Time.now
    @m.must_be :valid?
  end
  
  it "should support validates_presence" do
    @c.set_validations{validates_presence(:value)}
    @m.wont_be :valid?
    @m.value = ''
    @m.wont_be :valid?
    @m.value = 1234
    @m.must_be :valid?
    @m.value = nil
    @m.wont_be :valid?
    @m.value = true
    @m.must_be :valid?
    @m.value = false
    @m.must_be :valid?
    @m.value = Time.now
    @m.must_be :valid?
  end
  
  it "should support validates_unique with a single attribute" do
    @c.columns(:id, :username, :password)
    @c.set_dataset DB[:items]
    @c.set_validations{validates_unique(:username, :only_if_modified=>false)}
    @c.dataset = @c.dataset.with_fetch(proc do |sql|
      case sql
      when /count.*username = '0records'/
        {:v => 0}
      when /count.*username = '1record'/
        {:v => 1}
      end
    end)
    
    @user = @c.new(:username => "0records", :password => "anothertest")
    @user.must_be :valid?
    @user = @c.load(:id=>3, :username => "0records", :password => "anothertest")
    @user.must_be :valid?

    DB.sqls
    @user = @c.new(:password => "anothertest")
    @user.must_be :valid?
    DB.sqls.must_equal []

    @user = @c.new(:username => "1record", :password => "anothertest")
    @user.wont_be :valid?
    @user.errors.full_messages.must_equal ['username is already taken']
    @user = @c.load(:id=>4, :username => "1record", :password => "anothertest")
    @user.wont_be :valid?
    @user.errors.full_messages.must_equal ['username is already taken']

    @user = @c.load(:id=>1, :username => "0records", :password => "anothertest")
    @user.must_be :valid?
    DB.sqls.last.must_equal "SELECT count(*) AS count FROM items WHERE ((username = '0records') AND (id != 1)) LIMIT 1"
    @user = @c.new(:username => "0records", :password => "anothertest")
    @user.must_be :valid?
    DB.sqls.last.must_equal "SELECT count(*) AS count FROM items WHERE (username = '0records') LIMIT 1"
  end
  
  it "should support validates_unique with multiple attributes" do
    @c.columns(:id, :username, :password)
    @c.set_dataset DB[:items]
    @c.set_validations{validates_unique([:username, :password], :only_if_modified=>false)}
    @c.dataset = @c.dataset.with_fetch(proc do |sql|
      case sql
      when /count.*username = '0records'/
        {:v => 0}
      when /count.*username = '1record'/
        {:v => 1}
      end
    end)
    
    @user = @c.new(:username => "0records", :password => "anothertest")
    @user.must_be :valid?
    @user = @c.load(:id=>3, :username => "0records", :password => "anothertest")
    @user.must_be :valid?

    DB.sqls
    @user = @c.new(:password => "anothertest")
    @user.must_be :valid?
    @user.errors.full_messages.must_equal []
    @user = @c.new(:username => "0records")
    @user.must_be :valid?
    @user.errors.full_messages.must_equal []
    @user = @c.new
    @user.must_be :valid?
    @user.errors.full_messages.must_equal []
    DB.sqls.must_equal []

    @user = @c.new(:username => "1record", :password => "anothertest")
    @user.wont_be :valid?
    @user.errors.full_messages.must_equal ['username and password is already taken']
    @user = @c.load(:id=>4, :username => "1record", :password => "anothertest")
    @user.wont_be :valid?
    @user.errors.full_messages.must_equal ['username and password is already taken']

    @user = @c.load(:id=>1, :username => "0records", :password => "anothertest")
    @user.must_be :valid?
    DB.sqls.last.must_equal "SELECT count(*) AS count FROM items WHERE ((username = '0records') AND (password = 'anothertest') AND (id != 1)) LIMIT 1"
    @user = @c.new(:username => "0records", :password => "anothertest")
    @user.must_be :valid?
    DB.sqls.last.must_equal "SELECT count(*) AS count FROM items WHERE ((username = '0records') AND (password = 'anothertest')) LIMIT 1"
  end

  it "should support validates_unique with a block" do
    @c.columns(:id, :username, :password)
    @c.set_dataset DB[:items]
    @c.set_validations{validates_unique(:username, :only_if_modified=>false){|ds| ds.filter(:active)}}
    @c.dataset = @c.dataset.with_fetch(:v=>0)
    
    DB.reset
    @c.new(:username => "0records", :password => "anothertest").must_be :valid?
    @c.load(:id=>3, :username => "0records", :password => "anothertest").must_be :valid?
    DB.sqls.must_equal ["SELECT count(*) AS count FROM items WHERE ((username = '0records') AND active) LIMIT 1",
                    "SELECT count(*) AS count FROM items WHERE ((username = '0records') AND active AND (id != 3)) LIMIT 1"]
  end

  it "should support validates_unique with :where option" do
    @c.columns(:id, :username, :password)
    @c.set_dataset DB[:items]
    @c.set_validations{validates_unique(:username, :only_if_modified=>false, :where=>proc{|ds, obj, cols| ds.where(cols.map{|c| [Sequel.function(:lower, c), obj.send(c).downcase]})})}
    @c.dataset = @c.dataset.with_fetch(:v=>0)
    
    DB.reset
    @c.new(:username => "0RECORDS", :password => "anothertest").must_be :valid?
    @c.load(:id=>3, :username => "0RECORDS", :password => "anothertest").must_be :valid?
    DB.sqls.must_equal ["SELECT count(*) AS count FROM items WHERE (lower(username) = '0records') LIMIT 1",
                    "SELECT count(*) AS count FROM items WHERE ((lower(username) = '0records') AND (id != 3)) LIMIT 1"]
  end

  it "should support validates_unique with :dataset option" do
    @c.columns(:id, :username, :password)
    @c.set_dataset DB[:items]
    c = @c
    @c.set_validations{validates_unique(:username, :only_if_modified=>false, :dataset=>c.where(:a=>[1,2,3]))}
    @c.dataset = @c.dataset.with_fetch(:v=>0)
    
    DB.reset
    @c.new(:username => "0records", :password => "anothertest").must_be :valid?
    @c.load(:id=>3, :username => "0records", :password => "anothertest").must_be :valid?
    DB.sqls.must_equal ["SELECT count(*) AS count FROM items WHERE ((a IN (1, 2, 3)) AND (username = '0records')) LIMIT 1",
                    "SELECT count(*) AS count FROM items WHERE ((a IN (1, 2, 3)) AND (username = '0records') AND (id != 3)) LIMIT 1"]
  end

  it "should use qualified primary keys for validates_unique when the dataset is joined" do
    @c.columns(:id, :username, :password)
    @c.set_dataset DB[:items]
    c = @c
    @c.set_validations{validates_unique(:username, :only_if_modified=>false, :dataset=>c.cross_join(:a))}
    @c.dataset = @c.dataset.with_fetch(:v=>0)
    
    DB.reset
    @c.new(:username => "0records", :password => "anothertest").must_be :valid?
    @c.load(:id=>3, :username => "0records", :password => "anothertest").must_be :valid?
    DB.sqls.must_equal ["SELECT count(*) AS count FROM items CROSS JOIN a WHERE (username = '0records') LIMIT 1",
                    "SELECT count(*) AS count FROM items CROSS JOIN a WHERE ((username = '0records') AND (items.id != 3)) LIMIT 1"]
  end

  it "should not have validates_unique check uniqueness for existing records if values haven't changed" do
    @c.columns(:id, :username, :password)
    @c.set_dataset DB[:items]
    @c.set_validations{validates_unique([:username, :password])}
    @c.dataset = @c.dataset.with_fetch(:v=>0)
    
    DB.reset
    @c.new(:username => "0records", :password => "anothertest").must_be :valid?
    DB.sqls.must_equal ["SELECT count(*) AS count FROM items WHERE ((username = '0records') AND (password = 'anothertest')) LIMIT 1"]
    DB.reset
    m = @c.load(:id=>3, :username => "0records", :password => "anothertest")
    m.must_be :valid?
    DB.sqls.must_equal []

    m.username = '1'
    m.must_be :valid?
    DB.sqls.must_equal ["SELECT count(*) AS count FROM items WHERE ((username = '1') AND (password = 'anothertest') AND (id != 3)) LIMIT 1"]

    m = @c.load(:id=>3, :username => "0records", :password => "anothertest")
    DB.reset
    m.password = '1'
    m.must_be :valid?
    DB.sqls.must_equal ["SELECT count(*) AS count FROM items WHERE ((username = '0records') AND (password = '1') AND (id != 3)) LIMIT 1"]
    DB.reset
    m.username = '2'
    m.must_be :valid?
    DB.sqls.must_equal ["SELECT count(*) AS count FROM items WHERE ((username = '2') AND (password = '1') AND (id != 3)) LIMIT 1"]
  end

  it "should not attempt a database query if the underlying columns have validation errors" do
    @c.columns(:id, :username, :password)
    @c.set_dataset DB[:items]
    @c.set_validations{errors.add(:username, 'foo'); validates_unique([:username, :password])}
    @c.dataset = @c.dataset.with_fetch(:v=>0)
    
    DB.reset
    m = @c.new(:username => "1", :password => "anothertest")
    m.wont_be :valid?
    DB.sqls.must_equal []
  end

  it "should support validates_operator" do
    @c.set_validations{validates_operator(:>, 3, :value)}
    @m.value = 1
    @m.wont_be :valid?
    @m.errors.full_messages.must_equal ['value is not > 3']
    @m.value = 3
    @m.wont_be :valid?
    @m.value = nil
    @m.wont_be :valid?
    @m.value = 4
    @m.must_be :valid?
  end
end 
