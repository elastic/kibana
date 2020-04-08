require_relative "spec_helper"

describe "class_table_inheritance plugin" do
  before do
    @db = Sequel.mock(:numrows=>1, :autoid=>proc{|sql| 1})
    def @db.supports_schema_parsing?() true end
    def @db.schema(table, opts={})
      {:employees=>[[:id, {:primary_key=>true, :type=>:integer}], [:name, {:type=>:string, :allow_null=>false}], [:kind, {:type=>:string}]],
       :managers=>[[:id, {:type=>:integer}], [:num_staff, {:type=>:integer, :allow_null=>false}] ],
       :executives=>[[:id, {:type=>:integer}], [:num_managers, {:type=>:integer}]],
       :staff=>[[:id, {:type=>:integer}], [:manager_id, {:type=>:integer}]],
       }[table.is_a?(Sequel::Dataset) ? table.first_source_table : table]
    end
    @db.extend_datasets do
      def columns
        {[:employees]=>[:id, :name, :kind],
         [:managers]=>[:id, :num_staff],
         [:executives]=>[:id, :num_managers],
         [:staff]=>[:id, :manager_id],
         [:employees, :managers]=>[:id, :name, :kind, :num_staff],
         [:employees, :managers, :executives]=>[:id, :name, :kind, :num_staff, :num_managers],
         [:employees, :staff]=>[:id, :name, :kind, :manager_id],
        }[opts[:from] + (opts[:join] || []).map{|x| x.table}]
      end
    end
    base = Sequel::Model(@db)
    base.plugin :auto_validations if @use_auto_validations
    class ::Employee < base
      def _save_refresh; @values[:id] = 1 end
      def self.columns
        dataset.columns || dataset.opts[:from].first.expression.columns
      end
      plugin :class_table_inheritance, :key=>:kind, :table_map=>{:Staff=>:staff}
    end 
    class ::Manager < Employee
      one_to_many :staff_members, :class=>:Staff
    end 
    class ::Executive < Manager
    end 
    class ::Ceo < Executive
    end 
    class ::Staff < Employee
      many_to_one :manager
    end 
    class ::Intern < Employee
    end 
    @ds = Employee.dataset
    @db.sqls
  end
  after do
    [:Intern, :Ceo, :Executive, :Manager, :Staff, :Employee].each{|s| Object.send(:remove_const, s)}
  end

  it "should freeze CTI information when freezing model class" do
    Employee.freeze
    Employee.cti_models.frozen?.must_equal true
    Employee.cti_tables.frozen?.must_equal true
    Employee.cti_instance_dataset.frozen?.must_equal true
    Employee.cti_table_columns.frozen?.must_equal true
    Employee.cti_table_map.frozen?.must_equal true
  end

  it "should not attempt to use prepared statements" do
    Manager.plugin :prepared_statements
    Manager.load(:id=>1, :kind=>'Manager', :num_staff=>2).save
    @db.sqls.must_equal ["UPDATE employees SET kind = 'Manager' WHERE (id = 1)", "UPDATE managers SET num_staff = 2 WHERE (id = 1)"]

    Employee.plugin :prepared_statements
    Employee.load(:id=>2, :kind=>'Employee').save
    @db.sqls.must_equal ["UPDATE employees SET kind = 'Employee' WHERE (id = 2)"]
  end

  it "#cti_models.first should be the model that loaded the plugin" do
    Executive.cti_models.first.must_equal Employee
  end

  it "should have simple_table = nil for all subclasses" do
    Manager.simple_table.must_be_nil
    Executive.simple_table.must_be_nil
    Ceo.simple_table.must_be_nil
    Staff.simple_table.must_be_nil
    Intern.simple_table.must_be_nil
  end
  
  it "should have working row_proc if using set_dataset in subclass to remove columns" do
    Manager.set_dataset(Manager.dataset.select(*(Manager.columns - [:blah])))
    Manager.dataset = Manager.dataset.with_fetch(:id=>1, :kind=>'Ceo')
    Manager[1].must_equal Ceo.load(:id=>1, :kind=>'Ceo')
  end

  it "should use a subquery in subclasses" do
    Employee.dataset.sql.must_equal 'SELECT * FROM employees'
    Manager.dataset.sql.must_equal 'SELECT * FROM (SELECT employees.id, employees.name, employees.kind, managers.num_staff FROM employees INNER JOIN managers ON (managers.id = employees.id)) AS employees'
    Executive.dataset.sql.must_equal 'SELECT * FROM (SELECT employees.id, employees.name, employees.kind, managers.num_staff, executives.num_managers FROM employees INNER JOIN managers ON (managers.id = employees.id) INNER JOIN executives ON (executives.id = managers.id)) AS employees'
    Ceo.dataset.sql.must_equal 'SELECT * FROM (SELECT employees.id, employees.name, employees.kind, managers.num_staff, executives.num_managers FROM employees INNER JOIN managers ON (managers.id = employees.id) INNER JOIN executives ON (executives.id = managers.id) WHERE (employees.kind IN (\'Ceo\'))) AS employees'
    Staff.dataset.sql.must_equal 'SELECT * FROM (SELECT employees.id, employees.name, employees.kind, staff.manager_id FROM employees INNER JOIN staff ON (staff.id = employees.id)) AS employees'
    Intern.dataset.sql.must_equal 'SELECT * FROM employees WHERE (employees.kind IN (\'Intern\'))'
  end
  
  it "should return rows with the correct class based on the polymorphic_key value" do
    @ds.with_fetch([{:kind=>'Employee'}, {:kind=>'Manager'}, {:kind=>'Executive'}, {:kind=>'Ceo'}, {:kind=>'Staff'}, {:kind=>'Intern'}]).all.collect{|x| x.class}.must_equal [Employee, Manager, Executive, Ceo, Staff, Intern]
  end 
  
  it "should return rows with the correct class based on the polymorphic_key value for subclasses" do
    Manager.dataset.with_fetch([{:kind=>'Manager'}, {:kind=>'Executive'}, {:kind=>'Ceo'}]).all.collect{|x| x.class}.must_equal [Manager, Executive, Ceo]
  end
  
  it "should have refresh return all columns in subclass after loading from superclass" do
    Employee.dataset = Employee.dataset.with_fetch([{:id=>1, :name=>'A', :kind=>'Ceo'}])
    Ceo.dataset = Ceo.dataset.with_fetch([{:id=>1, :name=>'A', :kind=>'Ceo', :num_staff=>3, :num_managers=>2}])
    a = Employee.first
    a.class.must_equal Ceo
    a.values.must_equal(:id=>1, :name=>'A', :kind=>'Ceo')
    a.refresh.values.must_equal(:id=>1, :name=>'A', :kind=>'Ceo', :num_staff=>3, :num_managers=>2)
    @db.sqls.must_equal ["SELECT * FROM employees LIMIT 1",
      "SELECT * FROM (SELECT employees.id, employees.name, employees.kind, managers.num_staff, executives.num_managers FROM employees INNER JOIN managers ON (managers.id = employees.id) INNER JOIN executives ON (executives.id = managers.id) WHERE (employees.kind IN ('Ceo'))) AS employees WHERE (id = 1) LIMIT 1"]
  end
  
  describe "with auto_validations plugin" do
    before(:all) do
      @use_auto_validations = true
    end

    it "should work" do
      e = Employee.new
      e.valid?.must_equal false
      e.errors.must_equal(:name=>["is not present"])

      e = Manager.new
      e.valid?.must_equal false
      e.errors.must_equal(:name=>["is not present"], :num_staff=>["is not present"])

      e = Executive.new
      e.valid?.must_equal false
      e.errors.must_equal(:name=>["is not present"], :num_staff=>["is not present"])
    end
  end
    
  it "should return rows with the current class if sti_key is nil" do
    Employee.plugin :class_table_inheritance
    Employee.dataset.with_fetch([{:kind=>'Employee'}, {:kind=>'Manager'}, {:kind=>'Executive'}, {:kind=>'Ceo'}, {:kind=>'Staff'}, {:kind=>'Intern'}]).all.map{|x| x.class}.must_equal [Employee, Employee, Employee, Employee, Employee, Employee]
  end
  
  it "should return rows with the current class if sti_key is nil in subclasses" do
    Employee.plugin :class_table_inheritance
    Object.send(:remove_const, :Executive)
    Object.send(:remove_const, :Manager)
    class ::Manager < Employee; end 
    class ::Executive < Manager; end 
    Manager.dataset.with_fetch([{:kind=>'Manager'}, {:kind=>'Executive'}]).all.map{|x| x.class}.must_equal [Manager, Manager]
  end
  
  it "should handle a model map with integer values" do
    Employee.plugin :class_table_inheritance, :key=>:kind, :model_map=>{0=>:Employee, 1=>:Manager, 2=>:Executive, 3=>:Ceo, 4=>:Intern}
    Object.send(:remove_const, :Intern)
    Object.send(:remove_const, :Ceo)
    Object.send(:remove_const, :Executive)
    Object.send(:remove_const, :Manager)
    class ::Intern < Employee; end 
    class ::Manager < Employee; end 
    class ::Executive < Manager; end 
    class ::Ceo < Executive; end 
    Employee.dataset = Employee.dataset.with_fetch([{:kind=>nil},{:kind=>0},{:kind=>1}, {:kind=>2}, {:kind=>3}, {:kind=>4}])
    Employee.all.collect{|x| x.class}.must_equal [Employee, Employee, Manager, Executive, Ceo, Intern]
    Manager.dataset = Manager.dataset.with_fetch([{:kind=>nil},{:kind=>0},{:kind=>1}, {:kind=>2}, {:kind=>3}])
    Manager.all.collect{|x| x.class}.must_equal [Manager, Employee, Manager, Executive, Ceo]
  end
  
  it "should fallback to the main class if the given class does not exist" do
    @ds.with_fetch([{:kind=>'Employee'}, {:kind=>'Manager'}, {:kind=>'Blah'}, {:kind=>'Staff'}]).all.map{|x| x.class}.must_equal [Employee, Manager, Employee, Staff]
  end
  
  it "should fallback to the main class if the given class does not exist in subclasses" do
    Manager.dataset.with_fetch([{:kind=>'Manager'}, {:kind=>'Executive'}, {:kind=>'Ceo'}, {:kind=>'Blah'}]).all.map{|x| x.class}.must_equal [Manager, Executive, Ceo, Manager]
  end

  it "should sets the model class name for the key when creating new parent class records" do
    Employee.create
    @db.sqls.must_equal ["INSERT INTO employees (kind) VALUES ('Employee')"]
  end
  
  it "should sets the model class name for the key when creating new class records for subclass without separate table" do
    Intern.create
    @db.sqls.must_equal ["INSERT INTO employees (kind) VALUES ('Intern')"]
  end
  
  it "should sets the model class name for the key when creating new subclass records" do
    Ceo.create
    @db.sqls.must_equal ["INSERT INTO employees (kind) VALUES ('Ceo')",
      "INSERT INTO managers (id) VALUES (1)",
      "INSERT INTO executives (id) VALUES (1)"]
  end

  it "should ignore existing sti_key value when creating new records" do
    Employee.create(:kind=>'Manager')
    @db.sqls.must_equal ["INSERT INTO employees (kind) VALUES ('Employee')"]
  end
    
  it "should ignore existing sti_key value in subclasses" do
    Manager.create(:kind=>'Executive')
    @db.sqls.must_equal ["INSERT INTO employees (kind) VALUES ('Manager')",
      "INSERT INTO managers (id) VALUES (1)"]
  end

  it "should handle validations on the type column field" do
    o = Employee.new
    def o.validate
      errors.add(:kind, 'not present') unless kind
    end
    o.valid?.must_equal true
  end

  it "should set the type column field even when not validating" do
    Employee.new.save(:validate=>false)
    @db.sqls.must_equal ["INSERT INTO employees (kind) VALUES ('Employee')"]
  end

  it "should allow specifying a map of names to tables to override implicit mapping" do
    Manager.dataset.sql.must_equal 'SELECT * FROM (SELECT employees.id, employees.name, employees.kind, managers.num_staff FROM employees INNER JOIN managers ON (managers.id = employees.id)) AS employees'
    Staff.dataset.sql.must_equal 'SELECT * FROM (SELECT employees.id, employees.name, employees.kind, staff.manager_id FROM employees INNER JOIN staff ON (staff.id = employees.id)) AS employees'
  end

  it "should lazily load attributes for columns in subclass tables" do
    Manager.dataset = Manager.dataset.with_fetch(:id=>1, :name=>'J', :kind=>'Ceo', :num_staff=>2)
    m = Manager[1]
    @db.sqls.must_equal ['SELECT * FROM (SELECT employees.id, employees.name, employees.kind, managers.num_staff FROM employees INNER JOIN managers ON (managers.id = employees.id)) AS employees WHERE (id = 1) LIMIT 1']
    @db.fetch = {:num_managers=>3}
    m.must_be_kind_of Ceo
    m.num_managers.must_equal 3
    @db.sqls.must_equal ['SELECT employees.num_managers FROM (SELECT employees.id, employees.name, employees.kind, managers.num_staff, executives.num_managers FROM employees INNER JOIN managers ON (managers.id = employees.id) INNER JOIN executives ON (executives.id = managers.id)) AS employees WHERE (employees.id = 1) LIMIT 1']
    m.values.must_equal(:id=>1, :name=>'J', :kind=>'Ceo', :num_staff=>2, :num_managers=>3)
  end

  it "should lazily load columns in middle classes correctly when loaded from parent class" do
    Employee.dataset = Employee.dataset.with_fetch(:id=>1, :kind=>'Ceo')
    @db.fetch = [[:num_staff=>2]]
    e = Employee[1]
    e.must_be_kind_of(Ceo)
    @db.sqls.must_equal ["SELECT * FROM employees WHERE (id = 1) LIMIT 1"]
    e.num_staff.must_equal 2
    @db.sqls.must_equal ["SELECT employees.num_staff FROM (SELECT employees.id, employees.name, employees.kind, managers.num_staff FROM employees INNER JOIN managers ON (managers.id = employees.id)) AS employees WHERE (employees.id = 1) LIMIT 1"]
  end

  it "should eagerly load lazily columns in subclasses when loaded from parent class" do
    Employee.dataset = Employee.dataset.with_fetch(:id=>1, :kind=>'Ceo')
    @db.fetch = [[{:id=>1, :num_staff=>2}], [{:id=>1, :num_managers=>3}]]
    e = Employee.all.first
    e.must_be_kind_of(Ceo)
    @db.sqls.must_equal ["SELECT * FROM employees"]
    e.num_staff.must_equal 2
    @db.sqls.must_equal ["SELECT employees.id, employees.num_staff FROM (SELECT employees.id, employees.name, employees.kind, managers.num_staff FROM employees INNER JOIN managers ON (managers.id = employees.id)) AS employees WHERE (employees.id IN (1))"]
    e.num_managers.must_equal 3
    @db.sqls.must_equal ['SELECT employees.id, employees.num_managers FROM (SELECT employees.id, employees.name, employees.kind, managers.num_staff, executives.num_managers FROM employees INNER JOIN managers ON (managers.id = employees.id) INNER JOIN executives ON (executives.id = managers.id)) AS employees WHERE (employees.id IN (1))']
  end
  
  it "should include schema for columns for tables for ancestor classes" do
    Employee.db_schema.must_equal(:id=>{:primary_key=>true, :type=>:integer}, :name=>{:type=>:string, :allow_null=>false}, :kind=>{:type=>:string})
    Manager.db_schema.must_equal(:id=>{:primary_key=>true, :type=>:integer}, :name=>{:type=>:string, :allow_null=>false}, :kind=>{:type=>:string}, :num_staff=>{:type=>:integer, :allow_null=>false})
    Executive.db_schema.must_equal(:id=>{:primary_key=>true, :type=>:integer}, :name=>{:type=>:string, :allow_null=>false}, :kind=>{:type=>:string}, :num_staff=>{:type=>:integer, :allow_null=>false}, :num_managers=>{:type=>:integer})
    Staff.db_schema.must_equal(:id=>{:primary_key=>true, :type=>:integer}, :name=>{:type=>:string, :allow_null=>false}, :kind=>{:type=>:string}, :manager_id=>{:type=>:integer})
    Intern.db_schema.must_equal(:id=>{:primary_key=>true, :type=>:integer}, :name=>{:type=>:string, :allow_null=>false}, :kind=>{:type=>:string})
  end

  it "should use the correct primary key (which should have the same name in all subclasses)" do
    [Employee, Manager, Executive, Ceo, Staff, Intern].each{|c| c.primary_key.must_equal :id}
  end

  it "should have table_name return the table name of the most specific table" do
    Employee.table_name.must_equal :employees
    Manager.table_name.must_equal :employees
    Executive.table_name.must_equal :employees
    Ceo.table_name.must_equal :employees
    Staff.table_name.must_equal :employees
    Intern.table_name.must_equal :employees
  end

  it "should delete the correct rows from all tables when deleting" do
    Employee.load(:id=>1).delete
    @db.sqls.must_equal ["DELETE FROM employees WHERE (id = 1)"]

    Intern.load(:id=>1).delete
    @db.sqls.must_equal ["DELETE FROM employees WHERE (id = 1)"]

    Ceo.load(:id=>1).delete
    @db.sqls.must_equal ["DELETE FROM executives WHERE (id = 1)", "DELETE FROM managers WHERE (id = 1)", "DELETE FROM employees WHERE (id = 1)"]
  end

  it "should not allow deletion of frozen object" do
    [Ceo, Executive, Employee, Manager, Intern].each do |c|
      o = c.load(:id=>1)
      o.freeze
      proc{o.delete}.must_raise(Sequel::Error)
      @db.sqls.must_equal []
    end
  end

  it "should insert the correct rows into all tables when inserting into parent class" do
    Employee.create(:name=>'E')
    @db.sqls.must_equal ["INSERT INTO employees (name, kind) VALUES ('E', 'Employee')"]
  end
    
  it "should insert the correct rows into all tables when inserting into subclass without separate table" do
    Intern.create(:name=>'E')
    @db.sqls.must_equal ["INSERT INTO employees (name, kind) VALUES ('E', 'Intern')"]
  end
    
  it "should insert the correct rows into all tables when inserting" do
    Ceo.create(:num_managers=>3, :num_staff=>2, :name=>'E')
    @db.sqls.must_equal ["INSERT INTO employees (name, kind) VALUES ('E', 'Ceo')",
      "INSERT INTO managers (id, num_staff) VALUES (1, 2)",
      "INSERT INTO executives (id, num_managers) VALUES (1, 3)"]
  end
    
  it "should insert the correct rows into all tables when inserting when insert_select is supported" do
    [Executive, Manager, Employee].each do |klass|
      klass.instance_variable_set(:@cti_instance_dataset, klass.cti_instance_dataset.with_extend do
        def supports_insert_select?; true; end
        def insert_select(v)
          db.run(insert_sql(v) + " RETURNING *")
          v.merge(:id=>1)
        end
      end)
    end
    Ceo.create(:num_managers=>3, :num_staff=>2, :name=>'E')
    @db.sqls.must_equal ["INSERT INTO employees (name, kind) VALUES ('E', 'Ceo') RETURNING *",
      "INSERT INTO managers (id, num_staff) VALUES (1, 2) RETURNING *",
      "INSERT INTO executives (id, num_managers) VALUES (1, 3) RETURNING *"]
  end
    
  it "should insert the correct rows into all tables with a given primary key" do
    e = Ceo.new(:num_managers=>3, :num_staff=>2, :name=>'E')
    e.id = 2
    e.save
    @db.sqls.must_equal ["INSERT INTO employees (id, name, kind) VALUES (2, 'E', 'Ceo')",
      "INSERT INTO managers (id, num_staff) VALUES (2, 2)",
      "INSERT INTO executives (id, num_managers) VALUES (2, 3)"]
  end

  it "should update the correct rows in all tables when updating parent class" do
    Employee.load(:id=>2).update(:name=>'E')
    @db.sqls.must_equal ["UPDATE employees SET name = 'E' WHERE (id = 2)"]
  end

  it "should update the correct rows in all tables when updating subclass without separate table" do
    Intern.load(:id=>2).update(:name=>'E')
    @db.sqls.must_equal ["UPDATE employees SET name = 'E' WHERE (id = 2)"]
  end

  it "should update the correct rows in all tables when updating" do
    Ceo.load(:id=>2).update(:num_managers=>3, :num_staff=>2, :name=>'E')
    @db.sqls.must_equal ["UPDATE employees SET name = 'E' WHERE (id = 2)", "UPDATE managers SET num_staff = 2 WHERE (id = 2)", "UPDATE executives SET num_managers = 3 WHERE (id = 2)"]
  end

  it "should raise error if one of the updates does not update a single row" do
    @db.numrows = [1, 0]
    proc{Ceo.load(:id=>2).update(:num_managers=>3, :num_staff=>2, :name=>'E')}.must_raise Sequel::NoExistingObject
    @db.sqls.must_equal ["UPDATE employees SET name = 'E' WHERE (id = 2)", "UPDATE managers SET num_staff = 2 WHERE (id = 2)"]
  end

  it "should handle many_to_one relationships correctly" do
    Manager.dataset = Manager.dataset.with_fetch(:id=>3, :name=>'E', :kind=>'Ceo', :num_managers=>3)
    Staff.load(:manager_id=>3).manager.must_equal Ceo.load(:id=>3, :name=>'E', :kind=>'Ceo', :num_managers=>3)
    @db.sqls.must_equal ['SELECT * FROM (SELECT employees.id, employees.name, employees.kind, managers.num_staff FROM employees INNER JOIN managers ON (managers.id = employees.id)) AS employees WHERE (id = 3) LIMIT 1']
  end
  
  it "should handle one_to_many relationships correctly" do
    Staff.dataset = Staff.dataset.with_fetch(:id=>1, :name=>'S', :kind=>'Staff', :manager_id=>3)
    Ceo.load(:id=>3).staff_members.must_equal [Staff.load(:id=>1, :name=>'S', :kind=>'Staff', :manager_id=>3)]
    @db.sqls.must_equal ['SELECT * FROM (SELECT employees.id, employees.name, employees.kind, staff.manager_id FROM employees INNER JOIN staff ON (staff.id = employees.id)) AS employees WHERE (employees.manager_id = 3)']
  end
end

describe "class_table_inheritance plugin without sti_key with :alias option" do
  before do
    @db = Sequel.mock(:numrows=>1, :autoid=>proc{|sql| 1})
    def @db.supports_schema_parsing?() true end
    def @db.schema(table, opts={})
      {:employees=>[[:id, {:primary_key=>true, :type=>:integer}], [:name, {:type=>:string}]],
       :managers=>[[:id, {:type=>:integer}], [:num_staff, {:type=>:integer}]],
       :executives=>[[:id, {:type=>:integer}], [:num_managers, {:type=>:integer}]],
       :staff=>[[:id, {:type=>:integer}], [:manager_id, {:type=>:integer}]],
       }[table.is_a?(Sequel::Dataset) ? table.first_source_table : table]
    end
    @db.extend_datasets do
      def columns
        {[:employees]=>[:id, :name],
         [:managers]=>[:id, :num_staff],
         [:executives]=>[:id, :num_managers],
         [:staff]=>[:id, :manager_id],
         [:employees, :managers]=>[:id, :name, :num_staff],
         [:employees, :managers, :executives]=>[:id, :name, :num_staff, :num_managers],
         [:employees, :staff]=>[:id, :name, :manager_id],
        }[opts[:from] + (opts[:join] || []).map{|x| x.table}]
      end
    end
    class ::Employee < Sequel::Model(@db)
      def _save_refresh; @values[:id] = 1 end
      def self.columns
        dataset.columns || dataset.opts[:from].first.expression.columns
      end
      plugin :class_table_inheritance, :table_map=>{:Staff=>:staff}, :alias=>:emps
    end 
    class ::Manager < Employee
      one_to_many :staff_members, :class=>:Staff
    end 
    class ::Executive < Manager
    end 
    class ::Staff < Employee
      many_to_one :manager
    end 
    @ds = Employee.dataset
    @db.sqls
  end
  after do
    Object.send(:remove_const, :Executive)
    Object.send(:remove_const, :Manager)
    Object.send(:remove_const, :Staff)
    Object.send(:remove_const, :Employee)
  end

  it "should have simple_table = nil for all subclasses" do
    Manager.simple_table.must_be_nil
    Executive.simple_table.must_be_nil
    Staff.simple_table.must_be_nil
  end
  
  it "should have working row_proc if using set_dataset in subclass to remove columns" do
    Manager.set_dataset(Manager.dataset.select(*(Manager.columns - [:blah])))
    Manager.dataset = Manager.dataset.with_fetch(:id=>1)
    Manager[1].must_equal Manager.load(:id=>1)
  end

  it "should use a joined dataset in subclasses" do
    Employee.dataset.sql.must_equal 'SELECT * FROM employees'
    Manager.dataset.sql.must_equal 'SELECT * FROM (SELECT employees.id, employees.name, managers.num_staff FROM employees INNER JOIN managers ON (managers.id = employees.id)) AS emps'
    Executive.dataset.sql.must_equal 'SELECT * FROM (SELECT employees.id, employees.name, managers.num_staff, executives.num_managers FROM employees INNER JOIN managers ON (managers.id = employees.id) INNER JOIN executives ON (executives.id = managers.id)) AS emps'
    Staff.dataset.sql.must_equal 'SELECT * FROM (SELECT employees.id, employees.name, staff.manager_id FROM employees INNER JOIN staff ON (staff.id = employees.id)) AS emps'
  end
  
  it "should return rows with the current class if sti_key is nil" do
    Employee.plugin(:class_table_inheritance)
    Employee.dataset = Employee.dataset.with_fetch([{}])
    Employee.first.class.must_equal Employee
  end
  
  it "should include schema for columns for tables for ancestor classes" do
    Employee.db_schema.must_equal(:id=>{:primary_key=>true, :type=>:integer}, :name=>{:type=>:string})
    Manager.db_schema.must_equal(:id=>{:primary_key=>true, :type=>:integer}, :name=>{:type=>:string}, :num_staff=>{:type=>:integer})
    Executive.db_schema.must_equal(:id=>{:primary_key=>true, :type=>:integer}, :name=>{:type=>:string}, :num_staff=>{:type=>:integer}, :num_managers=>{:type=>:integer})
    Staff.db_schema.must_equal(:id=>{:primary_key=>true, :type=>:integer}, :name=>{:type=>:string}, :manager_id=>{:type=>:integer})
  end

  it "should use the correct primary key (which should have the same name in all subclasses)" do
    [Employee, Manager, Executive, Staff].each{|c| c.primary_key.must_equal :id}
  end

  it "should have table_name return the table name of the most specific table" do
    Employee.table_name.must_equal :employees
    Manager.table_name.must_equal :emps
    Executive.table_name.must_equal :emps
    Staff.table_name.must_equal :emps
  end

  it "should delete the correct rows from all tables when deleting" do
    Executive.load(:id=>1).delete
    @db.sqls.must_equal ["DELETE FROM executives WHERE (id = 1)", "DELETE FROM managers WHERE (id = 1)", "DELETE FROM employees WHERE (id = 1)"]
  end

  it "should not allow deletion of frozen object" do
    o = Executive.load(:id=>1)
    o.freeze
    proc{o.delete}.must_raise(Sequel::Error)
    @db.sqls.must_equal []
  end

  it "should insert the correct rows into all tables when inserting" do
    Executive.create(:num_managers=>3, :num_staff=>2, :name=>'E')
    @db.sqls.must_equal ["INSERT INTO employees (name) VALUES ('E')",
      "INSERT INTO managers (id, num_staff) VALUES (1, 2)",
      "INSERT INTO executives (id, num_managers) VALUES (1, 3)"]
  end
    
  it "should insert the correct rows into all tables with a given primary key" do
    e = Executive.new(:num_managers=>3, :num_staff=>2, :name=>'E')
    e.id = 2
    e.save
    @db.sqls.must_equal ["INSERT INTO employees (id, name) VALUES (2, 'E')",
      "INSERT INTO managers (id, num_staff) VALUES (2, 2)",
      "INSERT INTO executives (id, num_managers) VALUES (2, 3)"]
  end

  it "should update the correct rows in all tables when updating" do
    Executive.load(:id=>2).update(:num_managers=>3, :num_staff=>2, :name=>'E')
    @db.sqls.must_equal ["UPDATE employees SET name = 'E' WHERE (id = 2)", "UPDATE managers SET num_staff = 2 WHERE (id = 2)", "UPDATE executives SET num_managers = 3 WHERE (id = 2)"]
  end

  it "should handle many_to_one relationships correctly" do
    Manager.dataset = Manager.dataset.with_fetch(:id=>3, :name=>'E',  :num_staff=>3)
    Staff.load(:manager_id=>3).manager.must_equal Manager.load(:id=>3, :name=>'E', :num_staff=>3)
    @db.sqls.must_equal ['SELECT * FROM (SELECT employees.id, employees.name, managers.num_staff FROM employees INNER JOIN managers ON (managers.id = employees.id)) AS emps WHERE (id = 3) LIMIT 1']
  end
  
  it "should handle one_to_many relationships correctly" do
    Staff.dataset = Staff.dataset.with_fetch(:id=>1, :name=>'S', :manager_id=>3)
    Executive.load(:id=>3).staff_members.must_equal [Staff.load(:id=>1, :name=>'S', :manager_id=>3)]
    @db.sqls.must_equal ['SELECT * FROM (SELECT employees.id, employees.name, staff.manager_id FROM employees INNER JOIN staff ON (staff.id = employees.id)) AS emps WHERE (emps.manager_id = 3)']
  end
end

describe "class_table_inheritance plugin with duplicate columns" do
  it "should raise error if no columns are explicitly ignored" do
    @db = Sequel.mock(:autoid=>proc{|sql| 1})
    def @db.supports_schema_parsing?() true end
    def @db.schema(table, opts={})
      {:employees=>[[:id, {:primary_key=>true, :type=>:integer}], [:name, {:type=>:string}], [:kind, {:type=>:string}]],
       :managers=>[[:id, {:type=>:integer}], [:name, {:type=>:string}]],
       }[table.is_a?(Sequel::Dataset) ? table.first_source_table : table]
    end
    @db.extend_datasets do
      def columns
        {[:employees]=>[:id, :name, :kind],
         [:managers]=>[:id, :name],
        }[opts[:from] + (opts[:join] || []).map{|x| x.table}]
      end
    end
    class ::Employee < Sequel::Model(@db)
      def _save_refresh; @values[:id] = 1 end
      def self.columns
        dataset.columns || dataset.opts[:from].first.expression.columns
      end
      plugin :class_table_inheritance
    end 
    proc{class ::Manager < Employee; end}.must_raise Sequel::Error
  end

  describe "with certain sub-class columns ignored" do
    before do
      @db = Sequel.mock(:autoid=>proc{|sql| 1})
      def @db.supports_schema_parsing?() true end
      def @db.schema(table, opts={})
        {:employees=>[[:id, {:primary_key=>true, :type=>:integer}], [:name, {:type=>:string}], [:kind, {:type=>:string}], [:updated_at, {:type=>:datetime}]],
         :managers=>[[:id, {:type=>:integer}], [:num_staff, {:type=>:integer}], [:updated_at, {:type=>:datetime}], [:another_duplicate_column, {:type=>:integer}]],
         :executives=>[[:id, {:type=>:integer}], [:num_managers, {:type=>:integer}], [:updated_at, {:type=>:datetime}], [:another_duplicate_column, {:type=>:integer}]],
         }[table.is_a?(Sequel::Dataset) ? table.first_source_table : table]
      end
      @db.extend_datasets do
        def columns
          {[:employees]=>[:id, :name, :kind, :updated_at],
           [:managers]=>[:id, :num_staff, :updated_at, :another_duplicate_column],
           [:executives]=>[:id, :num_managers, :updated_at, :another_duplicate_column],
           [:employees, :managers]=>[:id, :name, :kind, :updated_at, :num_staff],
          }[opts[:from] + (opts[:join] || []).map{|x| x.table}]
        end
      end
      class ::Employee < Sequel::Model(@db)
        def _save_refresh; @values[:id] = 1 end
        def self.columns
          dataset.columns || dataset.opts[:from].first.expression.columns
        end
        plugin :class_table_inheritance, :ignore_subclass_columns=>[:updated_at]
      end 
      class ::Manager < Employee
        Manager.cti_ignore_subclass_columns.push(:another_duplicate_column)
      end
      class ::Executive < Manager; end
    end

    it "should not use the ignored column in a sub-class subquery" do
      Employee.dataset.sql.must_equal 'SELECT * FROM employees'
      Manager.dataset.sql.must_equal 'SELECT * FROM (SELECT employees.id, employees.name, employees.kind, employees.updated_at, managers.num_staff, managers.another_duplicate_column FROM employees INNER JOIN managers ON (managers.id = employees.id)) AS employees'
      Executive.dataset.sql.must_equal 'SELECT * FROM (SELECT employees.id, employees.name, employees.kind, employees.updated_at, managers.num_staff, managers.another_duplicate_column, executives.num_managers FROM employees INNER JOIN managers ON (managers.id = employees.id) INNER JOIN executives ON (executives.id = managers.id)) AS employees'
    end

    it "should include schema for columns for tables for ancestor classes" do
      Employee.db_schema.must_equal(:id=>{:primary_key=>true, :type=>:integer}, :name=>{:type=>:string}, :kind=>{:type=>:string}, :updated_at=>{:type=>:datetime})
      Manager.db_schema.must_equal(:id=>{:primary_key=>true, :type=>:integer}, :name=>{:type=>:string}, :kind=>{:type=>:string}, :updated_at=>{:type=>:datetime}, :num_staff=>{:type=>:integer}, :another_duplicate_column=>{:type=>:integer})
      Executive.db_schema.must_equal(:id=>{:primary_key=>true, :type=>:integer}, :name=>{:type=>:string}, :kind=>{:type=>:string}, :updated_at=>{:type=>:datetime}, :num_staff=>{:type=>:integer}, :another_duplicate_column=>{:type=>:integer}, :num_managers=>{:type=>:integer})
    end

    after do
      Object.send(:remove_const, :Executive)
    end
  end

  after do
    Object.send(:remove_const, :Manager)
    Object.send(:remove_const, :Employee)
  end
end

describe "class_table_inheritance plugin with dataset defined with QualifiedIdentifier" do
  before do
    @db = Sequel.mock(:numrows=>1, :autoid=>proc{|sql| 1})
    def @db.supports_schema_parsing?() true end
    def @db.schema(table, opts={})
      {Sequel[:hr][:employees]=>[[:id, {:primary_key=>true, :type=>:integer}], [:name, {:type=>:string}], [:kind, {:type=>:string}]],
       Sequel[:hr][:managers]=>[[:id, {:type=>:integer}]],
       Sequel[:hr][:staff]=>[[:id, {:type=>:integer}], [:manager_id, {:type=>:integer}]],
       Sequel[:hr][:executives]=>[[:id, {:type=>:integer}], [:num_managers, {:type=>:integer}]],
      }[table.is_a?(Sequel::Dataset) ? table.first_source_table : table]
    end
    @db.extend_datasets do
      def columns
        {[Sequel[:hr][:employees]]=>[:id, :name, :kind],
         [Sequel[:hr][:managers]]=>[:id],
         [Sequel[:hr][:staff]]=>[:id, :manager_id],
         [Sequel[:hr][:employees], Sequel[:hr][:managers]]=>[:id, :name, :kind],
         [Sequel[:hr][:employees], Sequel[:hr][:staff]]=>[:id, :name, :kind, :manager_id],
         [Sequel[:hr][:employees], Sequel[:hr][:managers], Sequel[:hr][:executives]]=>[:id, :name, :kind, :manager_id, :num_managers],
        }[opts[:from] + (opts[:join] || []).map{|x| x.table}]
      end
    end
  end
  after do
    [:Manager, :Staff, :Employee, :Executive].each{|s| Object.send(:remove_const, s) if Object.const_defined?(s)}
  end

  describe "with table_map used to qualify subclasses" do
    before do
      ::Employee = Class.new(Sequel::Model)
      ::Employee.db = @db
      ::Employee.set_dataset(Sequel[:hr][:employees])
      class ::Employee
        def _save_refresh; @values[:id] = 1 end
        def self.columns
          dataset.columns || dataset.opts[:from].first.expression.columns
        end
        plugin :class_table_inheritance, :table_map=>{:Manager=>Sequel[:hr][:managers],:Staff=>Sequel[:hr][:staff]}
      end
      class ::Manager < Employee
        one_to_many :staff_members, :class=>:Staff
      end
      class ::Staff < Employee
        many_to_one :manager
      end
    end

    it "should handle many_to_one relationships correctly" do
      Manager.dataset = Manager.dataset.with_fetch(:id=>3, :name=>'E')
      Staff.load(:manager_id=>3).manager.must_equal Manager.load(:id=>3, :name=>'E')
      @db.sqls.must_equal ['SELECT * FROM (SELECT hr.employees.id, hr.employees.name, hr.employees.kind FROM hr.employees INNER JOIN hr.managers ON (hr.managers.id = hr.employees.id)) AS employees WHERE (id = 3) LIMIT 1']
    end

    it "should handle one_to_many relationships correctly" do
      Staff.dataset = Staff.dataset.with_fetch(:id=>1, :name=>'S', :manager_id=>3)
      Manager.load(:id=>3).staff_members.must_equal [Staff.load(:id=>1, :name=>'S', :manager_id=>3)]
      @db.sqls.must_equal ['SELECT * FROM (SELECT hr.employees.id, hr.employees.name, hr.employees.kind, hr.staff.manager_id FROM hr.employees INNER JOIN hr.staff ON (hr.staff.id = hr.employees.id)) AS employees WHERE (employees.manager_id = 3)']
    end
  end

  describe "without table_map or qualify_tables set" do
    it "should use a non-qualified subquery in subclasses" do
      def @db.schema(table, opts={})
        {Sequel[:hr][:employees]=>[[:id, {:primary_key=>true, :type=>:integer}], [:name, {:type=>:string}], [:kind, {:type=>:string}]],
         :managers=>[[:id, {:type=>:integer}]],
        }[table.is_a?(Sequel::Dataset) ? table.first_source_table : table]
      end
      @db.extend_datasets do
        def columns
          {[Sequel[:hr][:employees]]=>[:id, :name, :kind],
           [:managers]=>[:id],
           [Sequel[:hr][:employees], :managers]=>[:id, :name, :kind]
          }[opts[:from] + (opts[:join] || []).map{|x| x.table}]
        end
      end
      ::Employee = Class.new(Sequel::Model)
      ::Employee.db = @db
      ::Employee.set_dataset(Sequel[:hr][:employees])
      class ::Employee
        def _save_refresh; @values[:id] = 1 end
        def self.columns
          dataset.columns || dataset.opts[:from].first.expression.columns
        end
        plugin :class_table_inheritance
      end
      class ::Manager < ::Employee
      end

      Employee.dataset.sql.must_equal 'SELECT * FROM hr.employees'
      Manager.dataset.sql.must_equal 'SELECT * FROM (SELECT hr.employees.id, hr.employees.name, hr.employees.kind FROM hr.employees INNER JOIN managers ON (managers.id = hr.employees.id)) AS employees'
    end
  end

  describe "with qualify_tables option set" do
    it "should use a subquery with the same qualifier in subclasses" do
      ::Employee = Class.new(Sequel::Model)
      ::Employee.db = @db
      ::Employee.set_dataset(Sequel[:hr][:employees])
      class ::Employee
        def _save_refresh; @values[:id] = 1 end
        def self.columns
          dataset.columns || dataset.opts[:from].first.expression.columns
        end
        plugin :class_table_inheritance, :table_map=>{:Staff=>Sequel[:hr][:staff]}, qualify_tables: true
      end
      class ::Manager < ::Employee
        one_to_many :staff_members, :class=>:Staff
      end
      class ::Staff < ::Employee
        many_to_one :manager
      end
      class ::Executive < ::Manager
      end

      Employee.dataset.sql.must_equal 'SELECT * FROM hr.employees'
      Manager.dataset.sql.must_equal 'SELECT * FROM (SELECT hr.employees.id, hr.employees.name, hr.employees.kind FROM hr.employees INNER JOIN hr.managers ON (hr.managers.id = hr.employees.id)) AS employees'
      Staff.dataset.sql.must_equal 'SELECT * FROM (SELECT hr.employees.id, hr.employees.name, hr.employees.kind, hr.staff.manager_id FROM hr.employees INNER JOIN hr.staff ON (hr.staff.id = hr.employees.id)) AS employees'
      Executive.dataset.sql.must_equal 'SELECT * FROM (SELECT hr.employees.id, hr.employees.name, hr.employees.kind, hr.executives.num_managers FROM hr.employees INNER JOIN hr.managers ON (hr.managers.id = hr.employees.id) INNER JOIN hr.executives ON (hr.executives.id = hr.managers.id)) AS employees'
    end
  end
end

describe "class_table_inheritance plugin with schema_caching extension" do
  before do
    @db = Sequel.mock(:autoid=>proc{|sql| 1})
    def @db.supports_schema_parsing?() true end
    def @db.schema(table, opts={})
      {:employees=>[[:id, {:primary_key=>true, :type=>:integer}], [:name, {:type=>:string}], [:kind, {:type=>:string}]],
       :managers=>[[:id, {:type=>:integer}], [:num_staff, {:type=>:integer}] ],
       :executives=>[[:id, {:type=>:integer}], [:num_managers, {:type=>:integer}]],
       }[table.is_a?(Sequel::Dataset) ? table.first_source_table : table]
    end
  end
  after do
    [:Executive, :Manager, :Employee, :Staff].each{|s| Object.send(:remove_const, s) if Object.const_defined?(s)}
  end

  it "should not query for columns if the schema cache is present and a table_map is given" do
    class ::Employee < Sequel::Model(@db)
      plugin :class_table_inheritance, :table_map=>{:Staff=>:employees, :Manager=>:managers, :Executive=>:executives}
    end
    class ::Staff < Employee; end
    class ::Manager < Employee; end
    class ::Executive < Manager; end
    Employee.columns.must_equal [:id, :name, :kind]
    Staff.columns.must_equal [:id, :name, :kind]
    Manager.columns.must_equal [:id, :name, :kind, :num_staff]
    Executive.columns.must_equal [:id, :name, :kind, :num_staff, :num_managers]
    @db.sqls.must_equal []
  end

  it "should not query for columns if the schema cache is present and no table_map is given" do
    class ::Employee < Sequel::Model(@db)
      plugin :class_table_inheritance
    end
    class ::Manager < Employee; end
    class ::Executive < Manager; end
    @db.sqls.must_equal []
  end
end
