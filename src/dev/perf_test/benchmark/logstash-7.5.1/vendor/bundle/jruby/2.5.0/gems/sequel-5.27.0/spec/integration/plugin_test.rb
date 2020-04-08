require_relative "spec_helper"

describe "Class Table Inheritance Plugin" do
  before(:all) do
    @db = DB
    @db.instance_variable_get(:@schemas).clear
    @db.drop_table?(:staff, :executives, :managers, :employees)
    @db.create_table(:employees) do
      primary_key :id
      String :name
      String :kind
    end
    @db.create_table(:managers) do
      foreign_key :id, :employees, :primary_key=>true
      Integer :num_staff
    end
    @db.create_table(:executives) do
      foreign_key :id, :managers, :primary_key=>true
      Integer :num_managers
    end
    @db.create_table(:staff) do
      foreign_key :id, :employees, :primary_key=>true
      foreign_key :manager_id, :managers
    end
  end
  before do
    [:staff, :executives, :managers, :employees].each{|t| @db[t].delete}
    class ::Employee < Sequel::Model(@db)
      plugin :class_table_inheritance, :key=>:kind, :table_map=>{:Staff=>:staff}
    end 
    class ::Manager < Employee
      one_to_many :staff_members, :class=>:Staff
      one_to_one :first_staff_member, :clone=>:staff_members, :order=>:id
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
    
    @i1 = @db[:employees].insert(:name=>'E', :kind=>'Employee')
    @i2 = @db[:employees].insert(:name=>'S', :kind=>'Staff')
    @i3 = @db[:employees].insert(:name=>'M', :kind=>'Manager')
    @db[:managers].insert(:id=>@i3, :num_staff=>7)
    @i4 = @db[:employees].insert(:name=>'Ex', :kind=>'Executive')
    @db[:managers].insert(:id=>@i4, :num_staff=>5)
    @db[:executives].insert(:id=>@i4, :num_managers=>6)
    @i5 = @db[:employees].insert(:name=>'C', :kind=>'Ceo')
    @db[:managers].insert(:id=>@i5, :num_staff=>2)
    @db[:executives].insert(:id=>@i5, :num_managers=>1)
    @db[:staff].insert(:id=>@i2, :manager_id=>@i4)
    @i6 = @db[:employees].insert(:name=>'I', :kind=>'Intern')
  end
  after do
    [:Intern, :Ceo, :Executive, :Manager, :Staff, :Employee].each{|s| Object.send(:remove_const, s)}
  end
  after(:all) do
    @db.drop_table? :staff, :executives, :managers, :employees
  end

  it "should return rows as subclass instances" do
    Employee.order(:id).all.must_equal [
      Employee.load(:id=>@i1, :name=>'E', :kind=>'Employee'),
      Staff.load(:id=>@i2, :name=>'S', :kind=>'Staff'),
      Manager.load(:id=>@i3, :name=>'M', :kind=>'Manager'),
      Executive.load(:id=>@i4, :name=>'Ex', :kind=>'Executive'),
      Ceo.load(:id=>@i5, :name=>'C', :kind=>'Ceo'),
      Intern.load(:id=>@i6, :name=>'I', :kind=>'Intern'),
    ]
  end
  
  it "should lazily load columns in subclass tables" do
    Employee[@i2][:manager_id].must_be_nil
    Employee[@i2].manager_id.must_equal @i4
    Employee[@i3][:num_staff].must_be_nil
    Employee[@i3].num_staff.must_equal 7
    Employee[@i4][:num_staff].must_be_nil
    Employee[@i4].num_staff.must_equal 5
    Employee[@i4][:num_managers].must_be_nil
    Employee[@i4].num_managers.must_equal 6
    Employee[@i5][:num_managers].must_be_nil
    Employee[@i5].num_managers.must_equal 1
  end
  
  it "should eagerly load columns in subclass tables when retrieving multiple objects" do
    a = Employee.order(:id).all
    a[1][:manager_id].must_be_nil
    a[1].manager_id.must_equal @i4
    a[2][:num_staff].must_be_nil
    a[2].num_staff.must_equal 7
    a[3][:num_staff].must_equal 5 # eagerly loaded by previous call
    a[3].num_staff.must_equal 5
    a[3][:num_managers].must_be_nil
    a[3].num_managers.must_equal 6
    a[4][:num_managers].must_equal 1
    a[4].num_managers.must_equal 1
  end
  
  it "should include schema for columns for tables for ancestor classes" do
    Employee.db_schema.keys.sort_by{|x| x.to_s}.must_equal [:id, :kind, :name]
    Staff.db_schema.keys.sort_by{|x| x.to_s}.must_equal [:id, :kind, :manager_id, :name]
    Manager.db_schema.keys.sort_by{|x| x.to_s}.must_equal [:id, :kind, :name, :num_staff]
    Executive.db_schema.keys.sort_by{|x| x.to_s}.must_equal [:id, :kind, :name, :num_managers, :num_staff]
    Ceo.db_schema.keys.sort_by{|x| x.to_s}.must_equal [:id, :kind, :name, :num_managers, :num_staff]
    Intern.db_schema.keys.sort_by{|x| x.to_s}.must_equal [:id, :kind, :name]
  end
  
  it "should include columns for tables for ancestor classes" do
    Employee.columns.must_equal [:id, :name, :kind]
    Staff.columns.must_equal [:id, :name, :kind, :manager_id]
    Manager.columns.must_equal [:id, :name, :kind, :num_staff]
    Executive.columns.must_equal [:id, :name, :kind, :num_staff, :num_managers]
    Ceo.columns.must_equal [:id, :name, :kind, :num_staff, :num_managers]
    Intern.columns.must_equal [:id, :name, :kind]
  end
  
  it "should delete rows from all tables" do
    e = Ceo.first
    i = e.id
    e.staff_members_dataset.destroy
    e.destroy
    @db[:executives][:id=>i].must_be_nil
    @db[:managers][:id=>i].must_be_nil
    @db[:employees][:id=>i].must_be_nil
  end
  
  it "should handle associations only defined in subclasses" do
    Employee.filter(Sequel[:employees][:id]=>@i2).all.first.manager.id.must_equal @i4
  end

  it "should insert rows into all tables" do
    e = Ceo.create(:name=>'Ex2', :num_managers=>8, :num_staff=>9)
    i = e.id
    @db[:employees][:id=>i].must_equal(:id=>i, :name=>'Ex2', :kind=>'Ceo')
    @db[:managers][:id=>i].must_equal(:id=>i, :num_staff=>9)
    @db[:executives][:id=>i].must_equal(:id=>i, :num_managers=>8)
  end
  
  it "should update rows in all tables" do
    Executive[:id=>@i4].update(:name=>'Ex2', :num_managers=>8, :num_staff=>9)
    @db[:employees][:id=>@i4].must_equal(:id=>@i4, :name=>'Ex2', :kind=>'Executive')
    @db[:managers][:id=>@i4].must_equal(:id=>@i4, :num_staff=>9)
    @db[:executives][:id=>@i4].must_equal(:id=>@i4, :num_managers=>8)
  end
  
  it "should handle many_to_one relationships" do
    m = Staff.first.manager
    m.must_equal Manager[@i4]
    m.must_be_kind_of(Executive)
    Staff.first.update(:manager => Manager[@i3])
    Staff.first.manager.must_equal Manager[@i3]
  end
  
  it "should handle eagerly loading many_to_one relationships" do
    Staff.limit(1).eager(:manager).all.map{|x| x.manager}.must_equal [Manager[@i4]]
  end
  
  it "should handle eagerly graphing many_to_one relationships" do
    ss = Staff.eager_graph(:manager).all
    ss.must_equal [Staff[@i2]]
    ss.map{|x| x.manager}.must_equal [Manager[@i4]]
  end
  
  it "should handle one_to_many relationships" do
    Executive.first(:name=>'Ex').staff_members.must_equal [Staff[@i2]]
    i6 = @db[:employees].insert(:name=>'S2', :kind=>'Staff')
    @db[:staff].insert(:id=>i6, :manager_id=>@i4)
    Executive.first(:name=>'Ex').add_staff_member(i6)
    Executive.first(:name=>'Ex').staff_members{|ds| ds.order(:id)}.must_equal [Staff[@i2], Staff[i6]]
  end
  
  it "should handle one_to_many relationships" do
    Executive.first(:name=>'Ex').first_staff_member.must_equal Staff[@i2]
    i6 = @db[:employees].insert(:name=>'S2', :kind=>'Staff')
    @db[:staff].insert(:id=>i6, :manager_id=>@i4)
    Executive.first(:name=>'Ex').first_staff_member = Staff[i6]
    Executive.first(:name=>'Ex').staff_members.must_equal [Staff[i6]]
  end
  
  it "should handle eagerly loading one_to_many relationships" do
    Executive.where(:name=>'Ex').eager(:staff_members).first.staff_members.must_equal [Staff[@i2]]
  end
  
  it "should handle eagerly graphing one_to_many relationships" do
    es = Executive.where(Sequel[:employees][:name]=>'Ex').eager_graph(:staff_members).all
    es.must_equal [Executive[@i4]]
    es.map{|x| x.staff_members}.must_equal [[Staff[@i2]]]
  end
end

describe "Many Through Many Plugin" do
  before(:all) do
    @db = DB
    @db.instance_variable_get(:@schemas).clear
    @db.drop_table?(:albums_artists, :albums, :artists)
    @db.create_table(:albums) do
      primary_key :id
      String :name
    end
    @db.create_table(:artists) do
      primary_key :id
      String :name
    end
    @db.create_table(:albums_artists) do
      foreign_key :album_id, :albums
      foreign_key :artist_id, :artists
    end
  end
  before do
    [:albums_artists, :albums, :artists].each{|t| @db[t].delete}
    class ::Album < Sequel::Model(@db)
      many_to_many :artists
    end 
    class ::Artist < Sequel::Model(@db)
      plugin :many_through_many
    end 
    
    @artist1 = Artist.create(:name=>'1')
    @artist2 = Artist.create(:name=>'2')
    @artist3 = Artist.create(:name=>'3')
    @artist4 = Artist.create(:name=>'4')
    @album1 = Album.create(:name=>'A')
    @album1.add_artist(@artist1)
    @album1.add_artist(@artist2)
    @album2 = Album.create(:name=>'B')
    @album2.add_artist(@artist3)
    @album2.add_artist(@artist4)
    @album3 = Album.create(:name=>'C')
    @album3.add_artist(@artist2)
    @album3.add_artist(@artist3)
    @album4 = Album.create(:name=>'D')
    @album4.add_artist(@artist1)
    @album4.add_artist(@artist4)
  end
  after do
    [:Album, :Artist].each{|s| Object.send(:remove_const, s)}
  end
  after(:all) do
    @db.drop_table? :albums_artists, :albums, :artists
  end
  def around
    DB.transaction(:rollback=>:always){super}
  end
  
  def self_join(c)
    c.join(Sequel.as(c.table_name, :b), Array(c.primary_key).zip(Array(c.primary_key))).select_all(c.table_name)
  end

  it "should handle super simple case with 1 join table" do
    Artist.many_through_many :albums, [[:albums_artists, :artist_id, :album_id]]
    Artist[@artist1.id].albums.map{|x| x.name}.sort.must_equal %w'A D'
    Artist[@artist2.id].albums.map{|x| x.name}.sort.must_equal %w'A C'
    Artist[@artist3.id].albums.map{|x| x.name}.sort.must_equal %w'B C'
    Artist[@artist4.id].albums.map{|x| x.name}.sort.must_equal %w'B D'
    
    Artist[@artist1.id].albums.map{|x| x.name}.sort.must_equal %w'A D'
    Artist[@artist2.id].albums.map{|x| x.name}.sort.must_equal %w'A C'
    Artist[@artist3.id].albums.map{|x| x.name}.sort.must_equal %w'B C'
    Artist[@artist4.id].albums.map{|x| x.name}.sort.must_equal %w'B D'

    Artist.filter(:id=>@artist1.id).eager(:albums).all.map{|x| x.albums.map{|a| a.name}}.flatten.sort.must_equal %w'A D'
    Artist.filter(:id=>@artist2.id).eager(:albums).all.map{|x| x.albums.map{|a| a.name}}.flatten.sort.must_equal %w'A C'
    Artist.filter(:id=>@artist3.id).eager(:albums).all.map{|x| x.albums.map{|a| a.name}}.flatten.sort.must_equal %w'B C'
    Artist.filter(:id=>@artist4.id).eager(:albums).all.map{|x| x.albums.map{|a| a.name}}.flatten.sort.must_equal %w'B D'
    
    Artist.filter(Sequel[:artists][:id]=>@artist1.id).eager_graph(:albums).all.map{|x| x.albums.map{|a| a.name}}.flatten.sort.must_equal %w'A D'
    Artist.filter(Sequel[:artists][:id]=>@artist2.id).eager_graph(:albums).all.map{|x| x.albums.map{|a| a.name}}.flatten.sort.must_equal %w'A C'
    Artist.filter(Sequel[:artists][:id]=>@artist3.id).eager_graph(:albums).all.map{|x| x.albums.map{|a| a.name}}.flatten.sort.must_equal %w'B C'
    Artist.filter(Sequel[:artists][:id]=>@artist4.id).eager_graph(:albums).all.map{|x| x.albums.map{|a| a.name}}.flatten.sort.must_equal %w'B D'

    Artist.filter(:albums=>@album1).all.map{|a| a.name}.sort.must_equal %w'1 2'
    Artist.filter(:albums=>@album2).all.map{|a| a.name}.sort.must_equal %w'3 4'
    Artist.filter(:albums=>@album3).all.map{|a| a.name}.sort.must_equal %w'2 3'
    Artist.filter(:albums=>@album4).all.map{|a| a.name}.sort.must_equal %w'1 4'

    Artist.exclude(:albums=>@album1).all.map{|a| a.name}.sort.must_equal %w'3 4'
    Artist.exclude(:albums=>@album2).all.map{|a| a.name}.sort.must_equal %w'1 2'
    Artist.exclude(:albums=>@album3).all.map{|a| a.name}.sort.must_equal %w'1 4'
    Artist.exclude(:albums=>@album4).all.map{|a| a.name}.sort.must_equal %w'2 3'

    Artist.filter(:albums=>[@album1, @album3]).all.map{|a| a.name}.sort.must_equal %w'1 2 3'
    Artist.filter(:albums=>[@album2, @album4]).all.map{|a| a.name}.sort.must_equal %w'1 3 4'

    Artist.exclude(:albums=>[@album1, @album3]).all.map{|a| a.name}.sort.must_equal %w'4'
    Artist.exclude(:albums=>[@album2, @album4]).all.map{|a| a.name}.sort.must_equal %w'2'

    Artist.filter(:albums=>Album.filter(:id=>[@album1.id, @album3.id])).all.map{|a| a.name}.sort.must_equal %w'1 2 3'
    Artist.exclude(:albums=>Album.filter(:id=>[@album1.id, @album3.id])).all.map{|a| a.name}.sort.must_equal %w'4'

    c = self_join(Artist)
    c.filter(:albums=>@album1).all.map{|a| a.name}.sort.must_equal %w'1 2'
    c.filter(:albums=>@album2).all.map{|a| a.name}.sort.must_equal %w'3 4'
    c.filter(:albums=>@album3).all.map{|a| a.name}.sort.must_equal %w'2 3'
    c.filter(:albums=>@album4).all.map{|a| a.name}.sort.must_equal %w'1 4'

    c.exclude(:albums=>@album1).all.map{|a| a.name}.sort.must_equal %w'3 4'
    c.exclude(:albums=>@album2).all.map{|a| a.name}.sort.must_equal %w'1 2'
    c.exclude(:albums=>@album3).all.map{|a| a.name}.sort.must_equal %w'1 4'
    c.exclude(:albums=>@album4).all.map{|a| a.name}.sort.must_equal %w'2 3'

    c.filter(:albums=>[@album1, @album3]).all.map{|a| a.name}.sort.must_equal %w'1 2 3'
    c.filter(:albums=>[@album2, @album4]).all.map{|a| a.name}.sort.must_equal %w'1 3 4'

    c.exclude(:albums=>[@album1, @album3]).all.map{|a| a.name}.sort.must_equal %w'4'
    c.exclude(:albums=>[@album2, @album4]).all.map{|a| a.name}.sort.must_equal %w'2'

    c.filter(:albums=>self_join(Album).filter(Sequel[:albums][:id]=>[@album1.id, @album3.id])).all.map{|a| a.name}.sort.must_equal %w'1 2 3'
    c.exclude(:albums=>self_join(Album).filter(Sequel[:albums][:id]=>[@album1.id, @album3.id])).all.map{|a| a.name}.sort.must_equal %w'4'
  end

  it "should handle typical case with 3 join tables" do
    Artist.many_through_many :related_artists, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_artists, :album_id, :artist_id]], :class=>Artist, :distinct=>true, :delay_pks=>false
    Artist[@artist1.id].related_artists.map{|x| x.name}.sort.must_equal %w'1 2 4'
    Artist[@artist2.id].related_artists.map{|x| x.name}.sort.must_equal %w'1 2 3'
    Artist[@artist3.id].related_artists.map{|x| x.name}.sort.must_equal %w'2 3 4'
    Artist[@artist4.id].related_artists.map{|x| x.name}.sort.must_equal %w'1 3 4'
    
    Artist[@artist1.id].related_artists.map{|x| x.name}.sort.must_equal %w'1 2 4'
    Artist[@artist2.id].related_artists.map{|x| x.name}.sort.must_equal %w'1 2 3'
    Artist[@artist3.id].related_artists.map{|x| x.name}.sort.must_equal %w'2 3 4'
    Artist[@artist4.id].related_artists.map{|x| x.name}.sort.must_equal %w'1 3 4'
    
    Artist.filter(:id=>@artist1.id).eager(:related_artists).all.map{|x| x.related_artists.map{|a| a.name}}.flatten.sort.must_equal %w'1 2 4'
    Artist.filter(:id=>@artist2.id).eager(:related_artists).all.map{|x| x.related_artists.map{|a| a.name}}.flatten.sort.must_equal %w'1 2 3'
    Artist.filter(:id=>@artist3.id).eager(:related_artists).all.map{|x| x.related_artists.map{|a| a.name}}.flatten.sort.must_equal %w'2 3 4'
    Artist.filter(:id=>@artist4.id).eager(:related_artists).all.map{|x| x.related_artists.map{|a| a.name}}.flatten.sort.must_equal %w'1 3 4'
    
    Artist.filter(Sequel[:artists][:id]=>@artist1.id).eager_graph(:related_artists).all.map{|x| x.related_artists.map{|a| a.name}}.flatten.sort.must_equal %w'1 2 4'
    Artist.filter(Sequel[:artists][:id]=>@artist2.id).eager_graph(:related_artists).all.map{|x| x.related_artists.map{|a| a.name}}.flatten.sort.must_equal %w'1 2 3'
    Artist.filter(Sequel[:artists][:id]=>@artist3.id).eager_graph(:related_artists).all.map{|x| x.related_artists.map{|a| a.name}}.flatten.sort.must_equal %w'2 3 4'
    Artist.filter(Sequel[:artists][:id]=>@artist4.id).eager_graph(:related_artists).all.map{|x| x.related_artists.map{|a| a.name}}.flatten.sort.must_equal %w'1 3 4'

    Artist.filter(:related_artists=>@artist1).all.map{|a| a.name}.sort.must_equal %w'1 2 4'
    Artist.filter(:related_artists=>@artist2).all.map{|a| a.name}.sort.must_equal %w'1 2 3'
    Artist.filter(:related_artists=>@artist3).all.map{|a| a.name}.sort.must_equal %w'2 3 4'
    Artist.filter(:related_artists=>@artist4).all.map{|a| a.name}.sort.must_equal %w'1 3 4'

    Artist.exclude(:related_artists=>@artist1).all.map{|a| a.name}.sort.must_equal %w'3'
    Artist.exclude(:related_artists=>@artist2).all.map{|a| a.name}.sort.must_equal %w'4'
    Artist.exclude(:related_artists=>@artist3).all.map{|a| a.name}.sort.must_equal %w'1'
    Artist.exclude(:related_artists=>@artist4).all.map{|a| a.name}.sort.must_equal %w'2'

    Artist.filter(:related_artists=>[@artist1, @artist4]).all.map{|a| a.name}.sort.must_equal %w'1 2 3 4'
    Artist.exclude(:related_artists=>[@artist1, @artist4]).all.map{|a| a.name}.sort.must_equal %w''

    Artist.filter(:related_artists=>Artist.filter(:id=>@artist1.id)).all.map{|a| a.name}.sort.must_equal %w'1 2 4'
    Artist.exclude(:related_artists=>Artist.filter(:id=>@artist1.id)).all.map{|a| a.name}.sort.must_equal %w'3'

    c = self_join(Artist)
    c.filter(:related_artists=>@artist1).all.map{|a| a.name}.sort.must_equal %w'1 2 4'
    c.filter(:related_artists=>@artist2).all.map{|a| a.name}.sort.must_equal %w'1 2 3'
    c.filter(:related_artists=>@artist3).all.map{|a| a.name}.sort.must_equal %w'2 3 4'
    c.filter(:related_artists=>@artist4).all.map{|a| a.name}.sort.must_equal %w'1 3 4'

    c.exclude(:related_artists=>@artist1).all.map{|a| a.name}.sort.must_equal %w'3'
    c.exclude(:related_artists=>@artist2).all.map{|a| a.name}.sort.must_equal %w'4'
    c.exclude(:related_artists=>@artist3).all.map{|a| a.name}.sort.must_equal %w'1'
    c.exclude(:related_artists=>@artist4).all.map{|a| a.name}.sort.must_equal %w'2'

    c.filter(:related_artists=>[@artist1, @artist4]).all.map{|a| a.name}.sort.must_equal %w'1 2 3 4'
    c.exclude(:related_artists=>[@artist1, @artist4]).all.map{|a| a.name}.sort.must_equal %w''

    c.filter(:related_artists=>c.filter(Sequel[:artists][:id]=>@artist1.id)).all.map{|a| a.name}.sort.must_equal %w'1 2 4'
    c.exclude(:related_artists=>c.filter(Sequel[:artists][:id]=>@artist1.id)).all.map{|a| a.name}.sort.must_equal %w'3'
  end

  it "should handle extreme case with 5 join tables" do
    Artist.many_through_many :related_albums, [[:albums_artists, :artist_id, :album_id], [:albums, :id, :id], [:albums_artists, :album_id, :artist_id], [:artists, :id, :id], [:albums_artists, :artist_id, :album_id]], :class=>Album, :distinct=>true
    @db[:albums_artists].delete
    @album1.add_artist(@artist1)
    @album1.add_artist(@artist2)
    @album2.add_artist(@artist2)
    @album2.add_artist(@artist3)
    @album3.add_artist(@artist1)
    @album4.add_artist(@artist3)
    @album4.add_artist(@artist4)
    
    Artist[@artist1.id].related_albums.map{|x| x.name}.sort.must_equal %w'A B C'
    Artist[@artist2.id].related_albums.map{|x| x.name}.sort.must_equal %w'A B C D'
    Artist[@artist3.id].related_albums.map{|x| x.name}.sort.must_equal %w'A B D'
    Artist[@artist4.id].related_albums.map{|x| x.name}.sort.must_equal %w'B D'
    
    Artist[@artist1.id].related_albums.map{|x| x.name}.sort.must_equal %w'A B C'
    Artist[@artist2.id].related_albums.map{|x| x.name}.sort.must_equal %w'A B C D'
    Artist[@artist3.id].related_albums.map{|x| x.name}.sort.must_equal %w'A B D'
    Artist[@artist4.id].related_albums.map{|x| x.name}.sort.must_equal %w'B D'
    
    Artist.filter(:id=>@artist1.id).eager(:related_albums).all.map{|x| x.related_albums.map{|a| a.name}}.flatten.sort.must_equal %w'A B C'
    Artist.filter(:id=>@artist2.id).eager(:related_albums).all.map{|x| x.related_albums.map{|a| a.name}}.flatten.sort.must_equal %w'A B C D'
    Artist.filter(:id=>@artist3.id).eager(:related_albums).all.map{|x| x.related_albums.map{|a| a.name}}.flatten.sort.must_equal %w'A B D'
    Artist.filter(:id=>@artist4.id).eager(:related_albums).all.map{|x| x.related_albums.map{|a| a.name}}.flatten.sort.must_equal %w'B D'
    
    Artist.filter(Sequel[:artists][:id]=>@artist1.id).eager_graph(:related_albums).all.map{|x| x.related_albums.map{|a| a.name}}.flatten.sort.must_equal %w'A B C'
    Artist.filter(Sequel[:artists][:id]=>@artist2.id).eager_graph(:related_albums).all.map{|x| x.related_albums.map{|a| a.name}}.flatten.sort.must_equal %w'A B C D'
    Artist.filter(Sequel[:artists][:id]=>@artist3.id).eager_graph(:related_albums).all.map{|x| x.related_albums.map{|a| a.name}}.flatten.sort.must_equal %w'A B D'
    Artist.filter(Sequel[:artists][:id]=>@artist4.id).eager_graph(:related_albums).all.map{|x| x.related_albums.map{|a| a.name}}.flatten.sort.must_equal %w'B D'

    Artist.filter(:related_albums=>@album1).all.map{|a| a.name}.sort.must_equal %w'1 2 3'
    Artist.filter(:related_albums=>@album2).all.map{|a| a.name}.sort.must_equal %w'1 2 3 4'
    Artist.filter(:related_albums=>@album3).all.map{|a| a.name}.sort.must_equal %w'1 2'
    Artist.filter(:related_albums=>@album4).all.map{|a| a.name}.sort.must_equal %w'2 3 4'

    Artist.exclude(:related_albums=>@album1).all.map{|a| a.name}.sort.must_equal %w'4'
    Artist.exclude(:related_albums=>@album2).all.map{|a| a.name}.sort.must_equal %w''
    Artist.exclude(:related_albums=>@album3).all.map{|a| a.name}.sort.must_equal %w'3 4'
    Artist.exclude(:related_albums=>@album4).all.map{|a| a.name}.sort.must_equal %w'1'

    Artist.filter(:related_albums=>[@album1, @album3]).all.map{|a| a.name}.sort.must_equal %w'1 2 3'
    Artist.filter(:related_albums=>[@album3, @album4]).all.map{|a| a.name}.sort.must_equal %w'1 2 3 4'

    Artist.exclude(:related_albums=>[@album1, @album3]).all.map{|a| a.name}.sort.must_equal %w'4'
    Artist.exclude(:related_albums=>[@album2, @album4]).all.map{|a| a.name}.sort.must_equal %w''

    Artist.filter(:related_albums=>Album.filter(:id=>[@album1.id, @album3.id])).all.map{|a| a.name}.sort.must_equal %w'1 2 3'
    Artist.exclude(:related_albums=>Album.filter(:id=>[@album1.id, @album3.id])).all.map{|a| a.name}.sort.must_equal %w'4'

    c = self_join(Artist)
    c.filter(:related_albums=>@album1).all.map{|a| a.name}.sort.must_equal %w'1 2 3'
    c.filter(:related_albums=>@album2).all.map{|a| a.name}.sort.must_equal %w'1 2 3 4'
    c.filter(:related_albums=>@album3).all.map{|a| a.name}.sort.must_equal %w'1 2'
    c.filter(:related_albums=>@album4).all.map{|a| a.name}.sort.must_equal %w'2 3 4'

    c.exclude(:related_albums=>@album1).all.map{|a| a.name}.sort.must_equal %w'4'
    c.exclude(:related_albums=>@album2).all.map{|a| a.name}.sort.must_equal %w''
    c.exclude(:related_albums=>@album3).all.map{|a| a.name}.sort.must_equal %w'3 4'
    c.exclude(:related_albums=>@album4).all.map{|a| a.name}.sort.must_equal %w'1'

    c.filter(:related_albums=>[@album1, @album3]).all.map{|a| a.name}.sort.must_equal %w'1 2 3'
    c.filter(:related_albums=>[@album3, @album4]).all.map{|a| a.name}.sort.must_equal %w'1 2 3 4'

    c.exclude(:related_albums=>[@album1, @album3]).all.map{|a| a.name}.sort.must_equal %w'4'
    c.exclude(:related_albums=>[@album2, @album4]).all.map{|a| a.name}.sort.must_equal %w''

    c.filter(:related_albums=>self_join(Album).filter(Sequel[:albums][:id]=>[@album1.id, @album3.id])).all.map{|a| a.name}.sort.must_equal %w'1 2 3'
    c.exclude(:related_albums=>self_join(Album).filter(Sequel[:albums][:id]=>[@album1.id, @album3.id])).all.map{|a| a.name}.sort.must_equal %w'4'
  end
end

describe "Lazy Attributes plugin" do 
  before(:all) do
    @db = DB
    @db.create_table!(:items) do
      primary_key :id
      String :name
      Integer :num
    end
    @db[:items].delete
    class ::Item < Sequel::Model(@db)
      plugin :lazy_attributes, :num
    end
    Item.create(:name=>'J', :num=>1)
  end
  after(:all) do
    @db.drop_table?(:items)
    Object.send(:remove_const, :Item)
  end
  
  it "should not include lazy attribute columns by default" do
    Item.first.must_equal Item.load(:id=>1, :name=>'J')
  end
  
  it "should load lazy attribute on access" do
    Item.first.num.must_equal 1
  end
  
  it "should typecast lazy attribute in setter" do
    i = Item.new
    i.num = '1'
    i.num.must_equal 1
  end
  
  it "should load lazy attribute for all items returned when accessing any item if using identity map " do
    Item.create(:name=>'K', :num=>2)
    a = Item.order(:name).all
    a.must_equal [Item.load(:id=>1, :name=>'J'), Item.load(:id=>2, :name=>'K')]
    a.map{|x| x[:num]}.must_equal [nil, nil]
    a.first.num.must_equal 1
    a.map{|x| x[:num]}.must_equal [1, 2]
    a.last.num.must_equal 2
  end
end

describe "Tactical Eager Loading Plugin" do
  before(:all) do
    @db = DB
    @db.instance_variable_get(:@schemas).clear
    @db.drop_table?(:albums_artists)
    @db.create_table!(:artists) do
      primary_key :id
      String :name
    end
    @db.create_table!(:albums) do
      primary_key :id
      String :name
      foreign_key :artist_id, :artists
    end
  end
  before do
    @db[:albums].delete
    @db[:artists].delete
    class ::Album < Sequel::Model(@db)
      plugin :tactical_eager_loading
      many_to_one :artist
    end
    class ::Artist < Sequel::Model(@db)
      plugin :tactical_eager_loading
      one_to_many :albums, :order=>:name
    end 
    
    @artist1 = Artist.create(:name=>'1')
    @artist2 = Artist.create(:name=>'2')
    @artist3 = Artist.create(:name=>'3')
    @artist4 = Artist.create(:name=>'4')
    @album1 = Album.create(:name=>'A', :artist=>@artist1)
    @album2 = Album.create(:name=>'B', :artist=>@artist1)
    @album3 = Album.create(:name=>'C', :artist=>@artist2)
    @album4 = Album.create(:name=>'D', :artist=>@artist3)
  end
  after do
    [:Album, :Artist].each{|s| Object.send(:remove_const, s)}
  end
  after(:all) do
    @db.drop_table? :albums, :artists
  end

  it "should eagerly load associations for all items when accessing any item" do
    a = Artist.order(:name).all
    a.map{|x| x.associations}.must_equal [{}, {}, {}, {}]
    a.first.albums.must_equal [@album1, @album2]
    a.map{|x| x.associations}.must_equal [{:albums=>[@album1, @album2]}, {:albums=>[@album3]}, {:albums=>[@album4]}, {:albums=>[]}]
    
    a = Album.order(:name).all
    a.map{|x| x.associations}.must_equal [{}, {}, {}, {}]
    a.first.artist.must_equal @artist1
    a.map{|x| x.associations}.must_equal [{:artist=>@artist1}, {:artist=>@artist1}, {:artist=>@artist2}, {:artist=>@artist3}]
  end
end

describe "Touch plugin" do
  before(:all) do
    @db = DB
    @db.drop_table? :albums_artists, :albums, :artists
    @db.create_table(:artists) do
      primary_key :id
      String :name
      DateTime :updated_at
    end
    @db.create_table(:albums) do
      primary_key :id
      String :name
      foreign_key :artist_id, :artists
      DateTime :updated_at
    end
    @db.create_join_table({:album_id=>:albums, :artist_id=>:artists}, :no_index=>true)
  end
  before do
    @db[:albums].delete
    @db[:artists].delete
    class ::Album < Sequel::Model(@db)
    end
    class ::Artist < Sequel::Model(@db)
    end 
    
    @artist = Artist.create(:name=>'1')
    @album = Album.create(:name=>'A', :artist_id=>@artist.id)
  end
  after do
    [:Album, :Artist].each{|s| Object.send(:remove_const, s)}
  end
  after(:all) do
    @db.drop_table? :albums_artists, :albums, :artists
  end
  def around
    DB.transaction(:rollback=>:always){super}
  end

  it "should update the timestamp column when touching the record" do
    Album.plugin :touch
    @album.updated_at.must_be_nil
    @album.touch
    @album.updated_at.to_i.must_be_close_to Time.now.to_i, 2
  end
  
  cspecify "should update the timestamp column for many_to_one associated records when the record is updated or destroyed", [:jdbc, :sqlite] do
    Album.many_to_one :artist
    Album.plugin :touch, :associations=>:artist
    @artist.updated_at.must_be_nil
    @album.update(:name=>'B')
    ua = @artist.reload.updated_at
    if ua.is_a?(Time)
      ua.to_i.must_be_close_to Time.now.to_i, 60
    else
      (DateTime.now - ua).must_be_close_to 0, 60.0/86400
    end
    @artist.update(:updated_at=>nil)
    @album.destroy
    if ua.is_a?(Time)
      ua.to_i.must_be_close_to Time.now.to_i, 60
    else
      (DateTime.now - ua).must_be_close_to 0, 60.0/86400
    end
  end

  cspecify "should update the timestamp column for one_to_many associated records when the record is updated", [:jdbc, :sqlite] do
    Artist.one_to_many :albums
    Artist.plugin :touch, :associations=>:albums
    @album.updated_at.must_be_nil
    @artist.update(:name=>'B')
    ua = @album.reload.updated_at
    if ua.is_a?(Time)
      ua.to_i.must_be_close_to Time.now.to_i, 60
    else
      (DateTime.now - ua).must_be_close_to 0, 60.0/86400
    end
  end

  cspecify "should update the timestamp column for many_to_many associated records when the record is updated", [:jdbc, :sqlite] do
    Artist.many_to_many :albums
    Artist.plugin :touch, :associations=>:albums
    @artist.add_album(@album)
    @album.updated_at.must_be_nil
    @artist.update(:name=>'B')
    ua = @album.reload.updated_at
    if ua.is_a?(Time)
      ua.to_i.must_be_close_to Time.now.to_i, 60
    else
      (DateTime.now - ua).must_be_close_to 0, 60.0/86400
    end
  end
end

describe "Serialization plugin" do 
  before do
    @db = DB
    @db.create_table!(:items) do
      primary_key :id
      String :stuff
    end
    class ::Item < Sequel::Model(@db)
      plugin :serialization, :marshal, :stuff
    end
  end
  after do
    @db.drop_table?(:items)
    Object.send(:remove_const, :Item)
  end

  it "should serialize and deserialize items as needed" do
    i = Item.create(:stuff=>{:a=>1})
    i.stuff.must_equal(:a=>1)
    i.stuff = [1, 2, 3]
    i.save
    Item.first.stuff.must_equal [1, 2, 3]
    i.update(:stuff=>Item.new)
    Item.first.stuff.must_equal Item.new
  end
end

describe "OptimisticLocking plugin" do 
  before(:all) do
    @db = DB
    @db.create_table!(:people) do
      primary_key :id
      String :name
      Integer :lock_version, :default=>0, :null=>false
    end
    class ::Person < Sequel::Model(@db)
      plugin :optimistic_locking
    end
  end
  before do
    @db[:people].delete
    @p = Person.create(:name=>'John')
  end
  after(:all) do
    @db.drop_table?(:people)
    Object.send(:remove_const, :Person)
  end

  it "should raise an error when updating a stale record" do
    p1 = Person[@p.id]
    p2 = Person[@p.id]
    p1.update(:name=>'Jim')
    proc{p2.update(:name=>'Bob')}.must_raise(Sequel::Plugins::OptimisticLocking::Error)
  end

  it "should raise an error when destroying a stale record" do
    p1 = Person[@p.id]
    p2 = Person[@p.id]
    p1.update(:name=>'Jim')
    proc{p2.destroy}.must_raise(Sequel::Plugins::OptimisticLocking::Error)
  end

  it "should not raise an error when updating the same record twice" do
    p1 = Person[@p.id]
    p1.update(:name=>'Jim')
    p1.update(:name=>'Bob')
  end
end

describe "Composition plugin" do 
  before do
    @db = DB
    @db.create_table!(:events) do
      primary_key :id
      Integer :year
      Integer :month
      Integer :day
    end
    class ::Event < Sequel::Model(@db)
      plugin :composition
      composition :date, :composer=>proc{Date.new(year, month, day) if year && month && day}, :decomposer=>(proc do
          if date
            self.year = date.year
            self.month = date.month
            self.day = date.day
          else
            self.year, self.month, self.day = nil
          end
        end)
      composition :date, :mapping=>[:year, :month, :day]
    end
    @e1 = Event.create(:year=>2010, :month=>2, :day=>15)
    @e2 = Event.create(:year=>nil)
  end
  after do
    @db.drop_table?(:events)
    Object.send(:remove_const, :Event)
  end

  it "should return a composed object if the underlying columns have a value" do
    @e1.date.must_equal Date.civil(2010, 2, 15)
    @e2.date.must_be_nil
  end

  it "should decompose the object when saving the record" do
    @e1.date = Date.civil(2009, 1, 2)
    @e1.save
    @e1.year.must_equal 2009
    @e1.month.must_equal 1
    @e1.day.must_equal 2
  end

  it "should save all columns when saving changes" do
    @e2.date = Date.civil(2009, 10, 2)
    @e2.save_changes
    @e2.reload
    @e2.year.must_equal 2009
    @e2.month.must_equal 10
    @e2.day.must_equal 2
  end
end

describe "RcteTree Plugin" do
  RcteTreePluginSpecs = shared_description do
    it "should load all standard (not-CTE) methods correctly" do
      @a.children.must_equal [@aa, @ab]
      @b.children.must_equal [@ba, @bb]
      @aa.children.must_equal [@aaa, @aab]
      @ab.children.must_equal [@aba, @abb]
      @ba.children.must_equal []
      @bb.children.must_equal []
      @aaa.children.must_equal [@aaaa, @aaab]
      @aab.children.must_equal []
      @aba.children.must_equal []
      @abb.children.must_equal []
      @aaaa.children.must_equal [@aaaaa]
      @aaab.children.must_equal []
      @aaaaa.children.must_equal []
      
      @a.parent.must_be_nil
      @b.parent.must_be_nil
      @aa.parent.must_equal @a
      @ab.parent.must_equal @a
      @ba.parent.must_equal @b
      @bb.parent.must_equal @b
      @aaa.parent.must_equal @aa
      @aab.parent.must_equal @aa
      @aba.parent.must_equal @ab
      @abb.parent.must_equal @ab
      @aaaa.parent.must_equal @aaa
      @aaab.parent.must_equal @aaa
      @aaaaa.parent.must_equal @aaaa
    end
    
    it "should load all ancestors and descendants lazily for a given instance" do
      @a.descendants.must_equal [@aa, @aaa, @aaaa, @aaaaa, @aaab, @aab, @ab, @aba, @abb]
      @b.descendants.must_equal [@ba, @bb]
      @aa.descendants.must_equal [@aaa, @aaaa, @aaaaa, @aaab, @aab]
      @ab.descendants.must_equal [@aba, @abb]
      @ba.descendants.must_equal []
      @bb.descendants.must_equal []
      @aaa.descendants.must_equal [@aaaa, @aaaaa, @aaab]
      @aab.descendants.must_equal []
      @aba.descendants.must_equal []
      @abb.descendants.must_equal []
      @aaaa.descendants.must_equal [@aaaaa]
      @aaab.descendants.must_equal []
      @aaaaa.descendants.must_equal []
      
      @a.ancestors.must_equal []
      @b.ancestors.must_equal []
      @aa.ancestors.must_equal [@a]
      @ab.ancestors.must_equal [@a]
      @ba.ancestors.must_equal [@b]
      @bb.ancestors.must_equal [@b]
      @aaa.ancestors.must_equal [@a, @aa]
      @aab.ancestors.must_equal [@a, @aa]
      @aba.ancestors.must_equal [@a, @ab]
      @abb.ancestors.must_equal [@a, @ab]
      @aaaa.ancestors.must_equal [@a, @aa, @aaa]
      @aaab.ancestors.must_equal [@a, @aa, @aaa]
      @aaaaa.ancestors.must_equal [@a, @aa, @aaa, @aaaa]
    end
    
    it "should eagerly load all ancestors and descendants for a dataset" do
      nodes = @Node.filter(@Node.primary_key=>[@a.pk, @b.pk, @aaa.pk]).order(:name).eager(:ancestors, :descendants).all
      nodes.must_equal [@a, @aaa, @b]
      nodes[0].descendants.must_equal [@aa, @aaa, @aaaa, @aaaaa, @aaab, @aab, @ab, @aba, @abb]
      nodes[1].descendants.must_equal [@aaaa, @aaaaa, @aaab]
      nodes[2].descendants.must_equal [@ba, @bb]
      nodes[0].ancestors.must_equal []
      nodes[1].ancestors.must_equal [@a, @aa]
      nodes[2].ancestors.must_equal []
    end

    it "should eagerly load descendants to a given level" do
      nodes = @Node.filter(@Node.primary_key=>[@a.pk, @b.pk, @aaa.pk]).order(:name).eager(:descendants=>1).all
      nodes.must_equal [@a, @aaa, @b]
      nodes[0].descendants.must_equal [@aa, @ab]
      nodes[1].descendants.must_equal [@aaaa, @aaab]
      nodes[2].descendants.must_equal [@ba, @bb]
      
      nodes = @Node.filter(@Node.primary_key=>[@a.pk, @b.pk, @aaa.pk]).order(:name).eager(:descendants=>2).all
      nodes.must_equal [@a, @aaa, @b]
      nodes[0].descendants.must_equal [@aa, @aaa, @aab, @ab, @aba, @abb]
      nodes[1].descendants.must_equal [@aaaa, @aaaaa, @aaab]
      nodes[2].descendants.must_equal [@ba, @bb]
    end
    
    it "should populate all :children associations when eagerly loading descendants for a dataset" do
      nodes = @Node.filter(@Node.primary_key=>[@a.pk, @b.pk, @aaa.pk]).order(:name).eager(:descendants).all
      nodes[0].associations[:children].must_equal [@aa, @ab]
      nodes[1].associations[:children].must_equal [@aaaa, @aaab]
      nodes[2].associations[:children].must_equal [@ba, @bb]
      nodes[0].associations[:children].map{|c1| c1.associations[:children]}.must_equal [[@aaa, @aab], [@aba, @abb]]
      nodes[1].associations[:children].map{|c1| c1.associations[:children]}.must_equal [[@aaaaa], []]
      nodes[2].associations[:children].map{|c1| c1.associations[:children]}.must_equal [[], []]
      nodes[0].associations[:children].map{|c1| c1.associations[:children].map{|c2| c2.associations[:children]}}.must_equal [[[@aaaa, @aaab], []], [[], []]]
      nodes[1].associations[:children].map{|c1| c1.associations[:children].map{|c2| c2.associations[:children]}}.must_equal [[[]], []]
      nodes[0].associations[:children].map{|c1| c1.associations[:children].map{|c2| c2.associations[:children].map{|c3| c3.associations[:children]}}}.must_equal [[[[@aaaaa], []], []], [[], []]]
      nodes[0].associations[:children].map{|c1| c1.associations[:children].map{|c2| c2.associations[:children].map{|c3| c3.associations[:children].map{|c4| c4.associations[:children]}}}}.must_equal [[[[[]], []], []], [[], []]]
    end
    
    it "should not populate :children associations for final level when loading descendants to a given level" do
      nodes = @Node.filter(@Node.primary_key=>[@a.pk, @b.pk, @aaa.pk]).order(:name).eager(:descendants=>1).all
      nodes[0].associations[:children].must_equal [@aa, @ab]
      nodes[0].associations[:children].map{|c1| c1.associations[:children]}.must_equal [nil, nil]
      nodes[1].associations[:children].must_equal [@aaaa, @aaab]
      nodes[1].associations[:children].map{|c1| c1.associations[:children]}.must_equal [nil, nil]
      nodes[2].associations[:children].must_equal [@ba, @bb]
      nodes[2].associations[:children].map{|c1| c1.associations[:children]}.must_equal [nil, nil]
      
      nodes[0].associations[:children].map{|c1| c1.children}.must_equal [[@aaa, @aab], [@aba, @abb]]
      nodes[1].associations[:children].map{|c1| c1.children}.must_equal [[@aaaaa], []]
      nodes[2].associations[:children].map{|c1| c1.children}.must_equal [[], []]
      
      nodes = @Node.filter(@Node.primary_key=>[@a.pk, @b.pk, @aaa.pk]).order(:name).eager(:descendants=>2).all
      nodes[0].associations[:children].must_equal [@aa, @ab]
      nodes[0].associations[:children].map{|c1| c1.associations[:children]}.must_equal [[@aaa, @aab], [@aba, @abb]]
      nodes[0].associations[:children].map{|c1| c1.associations[:children].map{|c2| c2.associations[:children]}}.must_equal [[[@aaaa, @aaab], nil], [nil, nil]]
      nodes[0].associations[:children].map{|c1| c1.associations[:children].map{|c2| (cc2 = c2.associations[:children]) ? cc2.map{|c3| c3.associations[:children]} : nil}}.must_equal [[[[@aaaaa], []], nil], [nil, nil]]
      nodes[0].associations[:children].map{|c1| c1.associations[:children].map{|c2| (cc2 = c2.associations[:children]) ? cc2.map{|c3| (cc3 = c3.associations[:children]) ? cc3.map{|c4| c4.associations[:children]} : nil} : nil}}.must_equal [[[[nil], []], nil], [nil, nil]]
      
      nodes[1].associations[:children].must_equal [@aaaa, @aaab]
      nodes[1].associations[:children].map{|c1| c1.associations[:children]}.must_equal [[@aaaaa], []]
      nodes[1].associations[:children].map{|c1| c1.associations[:children].map{|c2| c2.associations[:children]}}.must_equal [[nil], []]
      
      nodes[2].associations[:children].must_equal [@ba, @bb]
      nodes[2].associations[:children].map{|c1| c1.associations[:children]}.must_equal [[], []]
      
      nodes[0].associations[:children].map{|c1| c1.associations[:children].map{|c2| c2.children}}.must_equal [[[@aaaa, @aaab], []], [[], []]]
      nodes[0].associations[:children].map{|c1| c1.associations[:children].map{|c2| c2.children.map{|c3| c3.children}}}.must_equal [[[[@aaaaa], []], []], [[], []]]
      nodes[0].associations[:children].map{|c1| c1.associations[:children].map{|c2| c2.children.map{|c3| c3.children.map{|c4| c4.children}}}}.must_equal [[[[[]], []], []], [[], []]]
      nodes[1].associations[:children].map{|c1| c1.associations[:children].map{|c2| c2.children}}.must_equal [[[]], []]
    end
    
    it "should populate all :children associations when lazily loading descendants" do
      @a.descendants
      @a.associations[:children].must_equal [@aa, @ab]
      @a.associations[:children].map{|c1| c1.associations[:children]}.must_equal [[@aaa, @aab], [@aba, @abb]]
      @a.associations[:children].map{|c1| c1.associations[:children].map{|c2| c2.associations[:children]}}.must_equal [[[@aaaa, @aaab], []], [[], []]]
      @a.associations[:children].map{|c1| c1.associations[:children].map{|c2| c2.associations[:children].map{|c3| c3.associations[:children]}}}.must_equal [[[[@aaaaa], []], []], [[], []]]
      @a.associations[:children].map{|c1| c1.associations[:children].map{|c2| c2.associations[:children].map{|c3| c3.associations[:children].map{|c4| c4.associations[:children]}}}}.must_equal [[[[[]], []], []], [[], []]]
      
      @b.descendants
      @b.associations[:children].must_equal [@ba, @bb]
      @b.associations[:children].map{|c1| c1.associations[:children]}.must_equal [[], []]
      
      @aaa.descendants
      @aaa.associations[:children].map{|c1| c1.associations[:children]}.must_equal [[@aaaaa], []]
      @aaa.associations[:children].map{|c1| c1.associations[:children].map{|c2| c2.associations[:children]}}.must_equal [[[]], []]
    end
    
    it "should populate all :parent associations when eagerly loading ancestors for a dataset" do
      nodes = @Node.filter(@Node.primary_key=>[@a.pk, @ba.pk, @aaa.pk, @aaaaa.pk]).order(:name).eager(:ancestors).all
      nodes[0].associations.fetch(:parent, 1).must_be_nil
      nodes[1].associations[:parent].must_equal @aa
      nodes[1].associations[:parent].associations[:parent].must_equal @a
      nodes[1].associations[:parent].associations[:parent].associations.fetch(:parent, 1).must_be_nil
      nodes[2].associations[:parent].must_equal @aaaa
      nodes[2].associations[:parent].associations[:parent].must_equal @aaa
      nodes[2].associations[:parent].associations[:parent].associations[:parent].must_equal @aa
      nodes[2].associations[:parent].associations[:parent].associations[:parent].associations[:parent].must_equal @a
      nodes[2].associations[:parent].associations[:parent].associations[:parent].associations[:parent].associations.fetch(:parent, 1).must_be_nil
      nodes[3].associations[:parent].must_equal @b
      nodes[3].associations[:parent].associations.fetch(:parent, 1).must_be_nil
    end
    
    it "should populate all :parent associations when lazily loading ancestors" do
      @a.reload
      @a.ancestors
      @a.associations[:parent].must_be_nil
      
      @ba.reload
      @ba.ancestors
      @ba.associations[:parent].must_equal @b
      @ba.associations[:parent].associations.fetch(:parent, 1).must_be_nil
      
      @ba.reload
      @aaaaa.ancestors
      @aaaaa.associations[:parent].must_equal @aaaa
      @aaaaa.associations[:parent].associations[:parent].must_equal @aaa
      @aaaaa.associations[:parent].associations[:parent].associations[:parent].must_equal @aa
      @aaaaa.associations[:parent].associations[:parent].associations[:parent].associations[:parent].must_equal @a
      @aaaaa.associations[:parent].associations[:parent].associations[:parent].associations[:parent].associations.fetch(:parent, 1).must_be_nil
    end
  end

  before do
    @nodes.each{|n| n.associations.clear}
  end

  describe "with single key" do
    before(:all) do
      @db = DB
      @db.create_table!(:nodes) do
        primary_key :id
        Integer :parent_id
        String :name
      end
      @Node = Class.new(Sequel::Model(@db[:nodes]))
      @Node.plugin :rcte_tree, :order=>:name
      @nodes = []
      @nodes << @a = @Node.create(:name=>'a')
      @nodes << @b = @Node.create(:name=>'b')
      @nodes << @aa = @Node.create(:name=>'aa', :parent=>@a)
      @nodes << @ab = @Node.create(:name=>'ab', :parent=>@a)
      @nodes << @ba = @Node.create(:name=>'ba', :parent=>@b)
      @nodes << @bb = @Node.create(:name=>'bb', :parent=>@b)
      @nodes << @aaa = @Node.create(:name=>'aaa', :parent=>@aa)
      @nodes << @aab = @Node.create(:name=>'aab', :parent=>@aa)
      @nodes << @aba = @Node.create(:name=>'aba', :parent=>@ab)
      @nodes << @abb = @Node.create(:name=>'abb', :parent=>@ab)
      @nodes << @aaaa = @Node.create(:name=>'aaaa', :parent=>@aaa)
      @nodes << @aaab = @Node.create(:name=>'aaab', :parent=>@aaa)
      @nodes << @aaaaa = @Node.create(:name=>'aaaaa', :parent=>@aaaa)
    end
    after(:all) do
      @db.drop_table? :nodes
    end
    
    include RcteTreePluginSpecs

    it "should work correctly if not all columns are selected" do
      c = Class.new(Sequel::Model(@db[:nodes]))
      c.plugin :rcte_tree, :order=>:name
      c.plugin :lazy_attributes, :name
      c[:name=>'aaaa'].descendants.must_equal [c.load(:parent_id=>11, :id=>13)]
      c[:name=>'aa'].ancestors.must_equal [c.load(:parent_id=>nil, :id=>1)]
      nodes = c.filter(:id=>[@a.id, @b.id, @aaa.id]).order(:name).eager(:ancestors, :descendants).all
      nodes.must_equal [{:parent_id=>nil, :id=>1}, {:parent_id=>3, :id=>7}, {:parent_id=>nil, :id=>2}].map{|x| c.load(x)}
      nodes[2].descendants.must_equal [{:parent_id=>2, :id=>5}, {:parent_id=>2, :id=>6}].map{|x| c.load(x)}
      nodes[1].ancestors.must_equal [{:parent_id=>nil, :id=>1}, {:parent_id=>1, :id=>3}].map{|x| c.load(x)}
    end
  end

  describe "with composite keys" do
    before(:all) do
      @db = DB
      @db.create_table!(:nodes) do
        Integer :id
        Integer :id2
        Integer :parent_id
        Integer :parent_id2
        String :name
        primary_key [:id, :id2]
      end
      @Node = Class.new(Sequel::Model(@db[:nodes]))
      @Node.plugin :rcte_tree, :order=>:name, :key=>[:parent_id, :parent_id2]
      @Node.unrestrict_primary_key
      @nodes = []
      @nodes << @a = @Node.create(:id=>1, :id2=>1, :name=>'a')
      @nodes << @b = @Node.create(:id=>1, :id2=>2, :name=>'b')
      @nodes << @aa = @Node.create(:id=>2, :id2=>1, :name=>'aa', :parent=>@a)
      @nodes << @ab = @Node.create(:id=>2, :id2=>2, :name=>'ab', :parent=>@a)
      @nodes << @ba = @Node.create(:id=>3, :id2=>1, :name=>'ba', :parent=>@b)
      @nodes << @bb = @Node.create(:id=>3, :id2=>2, :name=>'bb', :parent=>@b)
      @nodes << @aaa = @Node.create(:id=>3, :id2=>3, :name=>'aaa', :parent=>@aa)
      @nodes << @aab = @Node.create(:id=>1, :id2=>3, :name=>'aab', :parent=>@aa)
      @nodes << @aba = @Node.create(:id=>2, :id2=>3, :name=>'aba', :parent=>@ab)
      @nodes << @abb = @Node.create(:id=>4, :id2=>1, :name=>'abb', :parent=>@ab)
      @nodes << @aaaa = @Node.create(:id=>1, :id2=>4, :name=>'aaaa', :parent=>@aaa)
      @nodes << @aaab = @Node.create(:id=>2, :id2=>4, :name=>'aaab', :parent=>@aaa)
      @nodes << @aaaaa = @Node.create(:id=>3, :id2=>4, :name=>'aaaaa', :parent=>@aaaa)
    end
    after(:all) do
      @db.drop_table? :nodes
    end
    
    include RcteTreePluginSpecs
  end
end if DB.dataset.supports_cte? and !Sequel.guarded?(:db2)

describe "Instance Filters plugin" do 
  before(:all) do
    @db = DB
    @db.create_table!(:items) do
      primary_key :id
      String :name
      Integer :cost
      Integer :number
    end
    class ::Item < Sequel::Model(@db)
      plugin :instance_filters
    end
  end
  before do
    @db[:items].delete
    @i = Item.create(:name=>'J', :number=>1, :cost=>2)
    @i.instance_filter(:number=>1)
    @i.set(:name=>'K')
  end
  after(:all) do
    @db.drop_table?(:items)
    Object.send(:remove_const, :Item)
  end
  
  it "should not raise an error if saving only updates one row" do
    @i.save
    @i.refresh.name.must_equal 'K'
  end
  
  it "should raise error if saving doesn't update a row" do
    @i.this.update(:number=>2)
    proc{@i.save}.must_raise(Sequel::NoExistingObject)
  end
  
  it "should apply all instance filters" do
    @i.instance_filter{cost <= 2}
    @i.this.update(:number=>2)
    proc{@i.save}.must_raise(Sequel::NoExistingObject)
    @i.this.update(:number=>1, :cost=>3)
    proc{@i.save}.must_raise(Sequel::NoExistingObject)
    @i.this.update(:cost=>2)
    @i.save
    @i.refresh.name.must_equal 'K'
  end
  
  it "should clear instance filters after successful save" do
    @i.save
    @i.this.update(:number=>2)
    @i.update(:name=>'L')
    @i.refresh.name.must_equal 'L'
  end
  
  it "should not raise an error if deleting only deletes one row" do
    @i.destroy
    proc{@i.refresh}.must_raise(Sequel::Error, 'Record not found')
  end
  
  it "should raise error if destroying doesn't delete a row" do
    @i.this.update(:number=>2)
    proc{@i.destroy}.must_raise(Sequel::NoExistingObject)
  end
end

describe "UpdatePrimaryKey plugin" do 
  before(:all) do
    @db = DB
    @db.create_table!(:t) do
      Integer :a, :primary_key=>true
      Integer :b
    end
    @ds = @db[:t]
    @c = Class.new(Sequel::Model(@ds))
    @c.set_primary_key(:a)
    @c.unrestrict_primary_key
    @c.plugin :update_primary_key
  end
  before do
    @ds.delete
    @ds.insert(:a=>1, :b=>3)
  end
  after(:all) do
    @db.drop_table?(:t)
  end

  it "should handle regular updates" do
    @c.first.update(:b=>4)
    @db[:t].all.must_equal [{:a=>1, :b=>4}]
    @c.first.set(:b=>5).save
    @db[:t].all.must_equal [{:a=>1, :b=>5}]
    @c.first.set(:b=>6).save(:columns=>:b)
    @db[:t].all.must_equal [{:a=>1, :b=>6}]
  end

  it "should handle updating the primary key field with another field" do
    @c.first.update(:a=>2, :b=>4)
    @db[:t].all.must_equal [{:a=>2, :b=>4}]
  end

  it "should handle updating just the primary key field when saving changes" do
    @c.first.update(:a=>2)
    @db[:t].all.must_equal [{:a=>2, :b=>3}]
    @c.first.set(:a=>3).save(:columns=>:a)
    @db[:t].all.must_equal [{:a=>3, :b=>3}]
  end

  it "should handle saving after modifying the primary key field with another field" do
    @c.first.set(:a=>2, :b=>4).save
    @db[:t].all.must_equal [{:a=>2, :b=>4}]
  end

  it "should handle saving after modifying just the primary key field" do
    @c.first.set(:a=>2).save
    @db[:t].all.must_equal [{:a=>2, :b=>3}]
  end

  it "should handle saving after updating the primary key" do
    @c.first.update(:a=>2).update(:b=>4).set(:b=>5).save
    @db[:t].all.must_equal [{:a=>2, :b=>5}]
  end
end

describe "AssociationPks plugin" do 
  before(:all) do
    @db = DB
    @db.drop_table?(:albums_tags, :albums_vocalists, :vocalists_instruments, :vocalists_hits, :hits, :instruments, :vocalists, :tags, :albums, :artists)
    @db.create_table(:artists) do
      primary_key :id
      String :name
    end
    @db.create_table(:albums) do
      primary_key :id
      String :name
      foreign_key :artist_id, :artists
    end
    @db.create_table(:tags) do
      primary_key :id
      String :name
    end
    @db.create_table(:albums_tags) do
      foreign_key :album_id, :albums
      foreign_key :tag_id, :tags
    end
    @db.create_table(:vocalists) do
      String :first
      String :last
      primary_key [:first, :last]
      foreign_key :album_id, :albums
    end
    @db.create_table(:albums_vocalists) do
      foreign_key :album_id, :albums
      String :first
      String :last
      foreign_key [:first, :last], :vocalists
    end
    @db.create_table(:instruments) do
      primary_key :id
      String :first
      String :last
      foreign_key [:first, :last], :vocalists
    end
    @db.create_table(:vocalists_instruments) do
      String :first
      String :last
      foreign_key [:first, :last], :vocalists
      foreign_key :instrument_id, :instruments
    end
    @db.create_table(:hits) do
      Integer :year
      Integer :week
      primary_key [:year, :week]
      String :first
      String :last
      foreign_key [:first, :last], :vocalists
    end
    @db.create_table(:vocalists_hits) do
      String :first
      String :last
      foreign_key [:first, :last], :vocalists
      Integer :year
      Integer :week
      foreign_key [:year, :week], :hits
    end
    class ::Artist < Sequel::Model
      plugin :association_pks
      one_to_many :albums, :order=>:id, :delay_pks=>false
    end 
    class ::Album < Sequel::Model
      plugin :association_pks
      many_to_many :tags, :order=>:id, :delay_pks=>false
      many_to_many :uat_tags, :order=>Sequel[:tags][:id], :delay_pks=>false, :class=>:Tag, :right_key=>:tag_id, :association_pks_use_associated_table=>true
    end 
    class ::Tag < Sequel::Model
    end 
    class ::Vocalist < Sequel::Model
      set_primary_key [:first, :last]
      plugin :association_pks
    end
    class ::Instrument < Sequel::Model
      plugin :association_pks
    end
    class ::Hit < Sequel::Model
      set_primary_key [:year, :week]
    end
  end
  before do
    [:albums_tags, :albums_vocalists, :vocalists_instruments, :vocalists_hits, :hits, :instruments, :vocalists, :tags, :albums, :artists].each{|t| @db[t].delete}
    @ar1 =@db[:artists].insert(:name=>'YJM')
    @ar2 =@db[:artists].insert(:name=>'AS')
    @al1 =@db[:albums].insert(:name=>'RF', :artist_id=>@ar1)
    @al2 =@db[:albums].insert(:name=>'MO', :artist_id=>@ar1)
    @al3 =@db[:albums].insert(:name=>'T', :artist_id=>@ar1)
    @t1 = @db[:tags].insert(:name=>'A')
    @t2 = @db[:tags].insert(:name=>'B')
    @t3 = @db[:tags].insert(:name=>'C')
    {@al1=>[@t1, @t2, @t3], @al2=>[@t2]}.each do |aid, tids|
      tids.each{|tid| @db[:albums_tags].insert([aid, tid])}
    end
    @v1 = ['F1', 'L1']
    @v2 = ['F2', 'L2']
    @v3 = ['F3', 'L3']
    @db[:vocalists].insert(@v1 + [@al1])
    @db[:vocalists].insert(@v2 + [@al1])
    @db[:vocalists].insert(@v3 + [@al1])
    @i1 = @db[:instruments].insert([:first, :last], @v1)
    @i2 = @db[:instruments].insert([:first, :last], @v1)
    @i3 = @db[:instruments].insert([:first, :last], @v1)
    @h1 = [1997, 1]
    @h2 = [1997, 2]
    @h3 = [1997, 3]
    @db[:hits].insert(@h1 + @v1)
    @db[:hits].insert(@h2 + @v1)
    @db[:hits].insert(@h3 + @v1)
    {@al1=>[@v1, @v2, @v3], @al2=>[@v2]}.each do |aid, vids|
      vids.each{|vid| @db[:albums_vocalists].insert([aid] + vid)}
    end
    {@v1=>[@i1, @i2, @i3], @v2=>[@i2]}.each do |vid, iids|
      iids.each{|iid| @db[:vocalists_instruments].insert(vid + [iid])}
    end
    {@v1=>[@h1, @h2, @h3], @v2=>[@h2]}.each do |vid, hids|
      hids.each{|hid| @db[:vocalists_hits].insert(vid + hid)}
    end
  end
  after(:all) do
    @db.drop_table? :albums_tags, :albums_vocalists, :vocalists_instruments, :vocalists_hits, :hits, :instruments, :vocalists, :tags, :albums, :artists
    [:Artist, :Album, :Tag, :Vocalist, :Instrument, :Hit].each{|s| Object.send(:remove_const, s)}
  end

  it "should return correct associated pks for one_to_many associations" do
    Artist.order(:id).all.map{|a| a.album_pks}.must_equal [[@al1, @al2, @al3], []]
  end

  it "should return correct associated pks for many_to_many associations" do
    Album.order(:id).all.map{|a| a.tag_pks.sort}.must_equal [[@t1, @t2, @t3], [@t2], []]
  end

  it "should return correct associated pks for many_to_many associations using :association_pks_use_associated_table" do
    Album.order(:id).all.map{|a| a.uat_tag_pks.sort}.must_equal [[@t1, @t2, @t3], [@t2], []]
  end

  it "should return correct associated right-side cpks for one_to_many associations" do
    Album.one_to_many :vocalists, :order=>:first
    Album.order(:id).all.map{|a| a.vocalist_pks.sort}.must_equal [[@v1, @v2, @v3], [], []]
  end

  it "should return correct associated right-side cpks for many_to_many associations" do
    Album.many_to_many :vocalists, :join_table=>:albums_vocalists, :right_key=>[:first, :last], :order=>:first
    Album.order(:id).all.map{|a| a.vocalist_pks.sort}.must_equal [[@v1, @v2, @v3], [@v2], []]
  end

  it "should return correct associated right-side cpks for many_to_many associations when using :association_pks_use_associated_table" do
    Album.many_to_many :vocalists, :join_table=>:albums_vocalists, :right_key=>[:first, :last], :order=>Sequel[:vocalists][:first], :association_pks_use_associated_table=>true
    Album.order(:id).all.map{|a| a.vocalist_pks.sort}.must_equal [[@v1, @v2, @v3], [@v2], []]
  end

  it "should return correct associated pks for left-side cpks for one_to_many associations" do
    Vocalist.one_to_many :instruments, :key=>[:first, :last], :order=>:id
    Vocalist.order(:first, :last).all.map{|a| a.instrument_pks.sort}.must_equal [[@i1, @i2, @i3], [], []]
  end

  it "should return correct associated pks for left-side cpks for many_to_many associations" do
    Vocalist.many_to_many :instruments, :join_table=>:vocalists_instruments, :left_key=>[:first, :last], :order=>:id
    Vocalist.order(:first, :last).all.map{|a| a.instrument_pks.sort}.must_equal [[@i1, @i2, @i3], [@i2], []]
  end

  it "should return correct associated pks for left-side cpks for many_to_many associations when using :association_pks_use_associated_table" do
    Vocalist.many_to_many :instruments, :join_table=>:vocalists_instruments, :left_key=>[:first, :last], :order=>:id, :association_pks_use_associated_table=>true
    Vocalist.order(:first, :last).all.map{|a| a.instrument_pks.sort}.must_equal [[@i1, @i2, @i3], [@i2], []]
  end

  it "should return correct associated right-side cpks for left-side cpks for one_to_many associations" do
    Vocalist.one_to_many :hits, :key=>[:first, :last], :order=>:week
    Vocalist.order(:first, :last).all.map{|a| a.hit_pks.sort}.must_equal [[@h1, @h2, @h3], [], []]
  end

  it "should return correct associated right-side cpks for left-side cpks for many_to_many associations" do
    Vocalist.many_to_many :hits, :join_table=>:vocalists_hits, :left_key=>[:first, :last], :right_key=>[:year, :week], :order=>:week
    Vocalist.order(:first, :last).all.map{|a| a.hit_pks.sort}.must_equal [[@h1, @h2, @h3], [@h2], []]
  end

  it "should return correct associated right-side cpks for left-side cpks for many_to_many associations when using :association_pks_use_associated_table" do
    Vocalist.many_to_many :hits, :join_table=>:vocalists_hits, :left_key=>[:first, :last], :right_key=>[:year, :week], :order=>Sequel[:vocalists_hits][:week], :association_pks_use_associated_table=>true
    Vocalist.order(:first, :last).all.map{|a| a.hit_pks.sort}.must_equal [[@h1, @h2, @h3], [@h2], []]
  end

  it "should default to delaying association_pks setter method changes until saving" do
    album_class = Class.new(Album)
    album_class.many_to_many :tags, :clone=>:tags, :delay_pks=>true, :join_table=>:albums_tags, :left_key=>:album_id
    album = album_class.with_pk!(@al1)
    album.tag_pks.sort.must_equal [@t1, @t2, @t3]
    album.tag_pks = [@t1, @t2]
    album.tag_pks.must_equal [@t1, @t2]
    album.save_changes
    album_class.with_pk!(album.pk).tag_pks.sort.must_equal [@t1, @t2]

    album.tag_pks = []
    album.tag_pks.must_equal []
    album.save_changes
    album_class.with_pk!(album.pk).tag_pks.sort.must_equal []
  end

  it "should set associated pks correctly for a one_to_many association" do
    Artist.use_transactions = true
    Album.order(:id).select_map(:artist_id).must_equal [@ar1, @ar1, @ar1]

    Artist[@ar2].album_pks = [@al1, @al3]
    Artist[@ar1].album_pks.must_equal [@al2]
    Album.order(:id).select_map(:artist_id).must_equal [@ar2, @ar1, @ar2]

    Artist[@ar1].album_pks = [@al1]
    Artist[@ar2].album_pks.must_equal [@al3]
    Album.order(:id).select_map(:artist_id).must_equal [@ar1, nil, @ar2]

    Artist[@ar1].album_pks = [@al1, @al2]
    Artist[@ar2].album_pks.must_equal [@al3]
    Album.order(:id).select_map(:artist_id).must_equal [@ar1, @ar1, @ar2]

    Artist[@ar1].album_pks = []
    Album.order(:id).select_map(:artist_id).must_equal [nil, nil, @ar2]
  end

  it "should set associated pks correctly for a many_to_many association" do
    Artist.use_transactions = true
    @db[:albums_tags].filter(:album_id=>@al1).select_order_map(:tag_id).must_equal [@t1, @t2, @t3]
    Album[@al1].tag_pks = [@t1, @t3]
    @db[:albums_tags].filter(:album_id=>@al1).select_order_map(:tag_id).must_equal [@t1, @t3]
    Album[@al1].tag_pks = []
    @db[:albums_tags].filter(:album_id=>@al1).select_order_map(:tag_id).must_equal []

    @db[:albums_tags].filter(:album_id=>@al2).select_order_map(:tag_id).must_equal [@t2]
    Album[@al2].tag_pks = [@t1, @t2]
    @db[:albums_tags].filter(:album_id=>@al2).select_order_map(:tag_id).must_equal [@t1, @t2]
    Album[@al2].tag_pks = []
    @db[:albums_tags].filter(:album_id=>@al1).select_order_map(:tag_id).must_equal []

    @db[:albums_tags].filter(:album_id=>@al3).select_order_map(:tag_id).must_equal []
    Album[@al3].tag_pks = [@t1, @t3]
    @db[:albums_tags].filter(:album_id=>@al3).select_order_map(:tag_id).must_equal [@t1, @t3]
    Album[@al3].tag_pks = []
    @db[:albums_tags].filter(:album_id=>@al1).select_order_map(:tag_id).must_equal []
  end

  it "should set associated right-side cpks correctly for a one_to_many association" do
    Album.use_transactions = true
    Album.one_to_many :vocalists, :order=>:first, :delay_pks=>false
    Album.order(:id).all.map{|a| a.vocalist_pks.sort}.must_equal [[@v1, @v2, @v3], [], []]

    Album[@al2].vocalist_pks = [@v1, @v3]
    Album[@al1].vocalist_pks.must_equal [@v2]
    Vocalist.order(:first, :last).select_map(:album_id).must_equal [@al2, @al1, @al2]

    Album[@al1].vocalist_pks = [@v1]
    Album[@al2].vocalist_pks.must_equal [@v3]
    Vocalist.order(:first, :last).select_map(:album_id).must_equal [@al1, nil, @al2]

    Album[@al1].vocalist_pks = [@v1, @v2]
    Album[@al2].vocalist_pks.must_equal [@v3]
    Vocalist.order(:first, :last).select_map(:album_id).must_equal [@al1, @al1, @al2]

    Album[@al1].vocalist_pks = []
    Vocalist.order(:first, :last).select_map(:album_id).must_equal [nil, nil, @al2]
  end

  it "should set associated right-side cpks correctly for a many_to_many association" do
    Album.use_transactions = true
    Album.many_to_many :vocalists, :join_table=>:albums_vocalists, :right_key=>[:first, :last], :order=>:first, :delay_pks=>false

    @db[:albums_vocalists].filter(:album_id=>@al1).select_order_map([:first, :last]).must_equal [@v1, @v2, @v3]
    Album[@al1].vocalist_pks = [@v1, @v3]
    @db[:albums_vocalists].filter(:album_id=>@al1).select_order_map([:first, :last]).must_equal [@v1, @v3]
    Album[@al1].vocalist_pks = []
    @db[:albums_vocalists].filter(:album_id=>@al1).select_order_map([:first, :last]).must_equal []

    @db[:albums_vocalists].filter(:album_id=>@al2).select_order_map([:first, :last]).must_equal [@v2]
    Album[@al2].vocalist_pks = [@v1, @v2]
    @db[:albums_vocalists].filter(:album_id=>@al2).select_order_map([:first, :last]).must_equal [@v1, @v2]
    Album[@al2].vocalist_pks = []
    @db[:albums_vocalists].filter(:album_id=>@al1).select_order_map([:first, :last]).must_equal []

    @db[:albums_vocalists].filter(:album_id=>@al3).select_order_map([:first, :last]).must_equal []
    Album[@al3].vocalist_pks = [@v1, @v3]
    @db[:albums_vocalists].filter(:album_id=>@al3).select_order_map([:first, :last]).must_equal [@v1, @v3]
    Album[@al3].vocalist_pks = []
    @db[:albums_vocalists].filter(:album_id=>@al1).select_order_map([:first, :last]).must_equal []
  end

  it "should set associated pks correctly with left-side cpks for a one_to_many association" do
    Vocalist.use_transactions = true
    Vocalist.one_to_many :instruments, :key=>[:first, :last], :order=>:id, :delay_pks=>false
    Vocalist.order(:first, :last).all.map{|a| a.instrument_pks.sort}.must_equal [[@i1, @i2, @i3], [], []]

    Vocalist[@v2].instrument_pks = [@i1, @i3]
    Vocalist[@v1].instrument_pks.must_equal [@i2]
    Instrument.order(:id).select_map([:first, :last]).must_equal [@v2, @v1, @v2]

    Vocalist[@v1].instrument_pks = [@i1]
    Vocalist[@v2].instrument_pks.must_equal [@i3]
    Instrument.order(:id).select_map([:first, :last]).must_equal [@v1, [nil, nil], @v2]

    Vocalist[@v1].instrument_pks = [@i1, @i2]
    Vocalist[@v2].instrument_pks.must_equal [@i3]
    Instrument.order(:id).select_map([:first, :last]).must_equal [@v1, @v1, @v2]

    Vocalist[@v1].instrument_pks = []
    Instrument.order(:id).select_map([:first, :last]).must_equal [[nil, nil], [nil, nil], @v2]
  end

  it "should set associated pks correctly with left-side cpks for a many_to_many association" do
    Vocalist.use_transactions = true
    Vocalist.many_to_many :instruments, :join_table=>:vocalists_instruments, :left_key=>[:first, :last], :order=>:id, :delay_pks=>false

    @db[:vocalists_instruments].filter([:first, :last]=>[@v1]).select_order_map(:instrument_id).must_equal [@i1, @i2, @i3]
    Vocalist[@v1].instrument_pks = [@i1, @i3]
    @db[:vocalists_instruments].filter([:first, :last]=>[@v1]).select_order_map(:instrument_id).must_equal [@i1, @i3]
    Vocalist[@v1].instrument_pks = []
    @db[:vocalists_instruments].filter([:first, :last]=>[@v1]).select_order_map(:instrument_id).must_equal []

    @db[:vocalists_instruments].filter([:first, :last]=>[@v2]).select_order_map(:instrument_id).must_equal [@i2]
    Vocalist[@v2].instrument_pks = [@i1, @i2]
    @db[:vocalists_instruments].filter([:first, :last]=>[@v2]).select_order_map(:instrument_id).must_equal [@i1, @i2]
    Vocalist[@v2].instrument_pks = []
    @db[:vocalists_instruments].filter([:first, :last]=>[@v1]).select_order_map(:instrument_id).must_equal []

    @db[:vocalists_instruments].filter([:first, :last]=>[@v3]).select_order_map(:instrument_id).must_equal []
    Vocalist[@v3].instrument_pks = [@i1, @i3]
    @db[:vocalists_instruments].filter([:first, :last]=>[@v3]).select_order_map(:instrument_id).must_equal [@i1, @i3]
    Vocalist[@v3].instrument_pks = []
    @db[:vocalists_instruments].filter([:first, :last]=>[@v1]).select_order_map(:instrument_id).must_equal []
  end

  it "should set associated right-side cpks correctly with left-side cpks for a one_to_many association" do
    Vocalist.use_transactions = true
    Vocalist.one_to_many :hits, :key=>[:first, :last], :order=>:week, :delay_pks=>false
    Vocalist.order(:first, :last).all.map{|a| a.hit_pks.sort}.must_equal [[@h1, @h2, @h3], [], []]

    Vocalist[@v2].hit_pks = [@h1, @h3]
    Vocalist[@v1].hit_pks.must_equal [@h2]
    Hit.order(:year, :week).select_map([:first, :last]).must_equal [@v2, @v1, @v2]

    Vocalist[@v1].hit_pks = [@h1]
    Vocalist[@v2].hit_pks.must_equal [@h3]
    Hit.order(:year, :week).select_map([:first, :last]).must_equal [@v1, [nil, nil], @v2]

    Vocalist[@v1].hit_pks = [@h1, @h2]
    Vocalist[@v2].hit_pks.must_equal [@h3]
    Hit.order(:year, :week).select_map([:first, :last]).must_equal [@v1, @v1, @v2]

    Vocalist[@v1].hit_pks = []
    Hit.order(:year, :week).select_map([:first, :last]).must_equal [[nil, nil], [nil, nil], @v2]
  end

  it "should set associated right-side cpks correctly with left-side cpks for a many_to_many association" do
    Vocalist.use_transactions = true
    Vocalist.many_to_many :hits, :join_table=>:vocalists_hits, :left_key=>[:first, :last], :right_key=>[:year, :week], :order=>:week, :delay_pks=>false

    @db[:vocalists_hits].filter([:first, :last]=>[@v1]).select_order_map([:year, :week]).must_equal [@h1, @h2, @h3]
    Vocalist[@v1].hit_pks = [@h1, @h3]
    @db[:vocalists_hits].filter([:first, :last]=>[@v1]).select_order_map([:year, :week]).must_equal [@h1, @h3]
    Vocalist[@v1].hit_pks = []
    @db[:vocalists_hits].filter([:first, :last]=>[@v1]).select_order_map([:year, :week]).must_equal []

    @db[:vocalists_hits].filter([:first, :last]=>[@v2]).select_order_map([:year, :week]).must_equal [@h2]
    Vocalist[@v2].hit_pks = [@h1, @h2]
    @db[:vocalists_hits].filter([:first, :last]=>[@v2]).select_order_map([:year, :week]).must_equal [@h1, @h2]
    Vocalist[@v2].hit_pks = []
    @db[:vocalists_hits].filter([:first, :last]=>[@v1]).select_order_map([:year, :week]).must_equal []

    @db[:vocalists_hits].filter([:first, :last]=>[@v3]).select_order_map([:year, :week]).must_equal []
    Vocalist[@v3].hit_pks = [@h1, @h3]
    @db[:vocalists_hits].filter([:first, :last]=>[@v3]).select_order_map([:year, :week]).must_equal [@h1, @h3]
    Vocalist[@v3].hit_pks = []
    @db[:vocalists_hits].filter([:first, :last]=>[@v1]).select_order_map([:year, :week]).must_equal []
  end
end

describe "List plugin without a scope" do
  before(:all) do
    @db = DB
    @db.create_table!(:sites) do
      primary_key :id
      String :name
      Integer :position
    end

    @c = Class.new(Sequel::Model(@db[:sites]))
    @c.plugin :list
  end
  before do
    @c.dataset.delete
    @c.create :name => "abc"
    @c.create :name => "def"
    @c.create :name => "hig"
  end
  after(:all) do
    @db.drop_table?(:sites)
  end

  it "should return rows in order of position" do
    @c.map(:position).must_equal [1,2,3]
    @c.map(:name).must_equal %w[ abc def hig ]
  end

  it "should define prev and next" do
    i = @c[:name => "abc"]
    i.prev.must_be_nil
    i = @c[:name => "def"]
    i.prev.must_equal @c[:name => "abc"]
    i.next.must_equal @c[:name => "hig"]
    i = @c[:name => "hig"]
    i.next.must_be_nil
  end

  it "should define move_to" do
    @c[:name => "def"].move_to(1)
    @c.map(:name).must_equal %w[ def abc hig ]

    @c[:name => "abc"].move_to(3)
    @c.map(:name).must_equal %w[ def hig abc ]

    @c[:name => "abc"].move_to(-1)
    @c.map(:name).must_equal %w[ abc def hig ]
    @c[:name => "abc"].move_to(10)
    @c.map(:name).must_equal %w[ def hig abc ]
  end

  it "should define move_to_top and move_to_bottom" do
    @c[:name => "def"].move_to_top
    @c.map(:name).must_equal %w[ def abc hig ]

    @c[:name => "def"].move_to_bottom
    @c.map(:name).must_equal %w[ abc hig def ]
  end

  it "should define move_up and move_down" do
    @c[:name => "def"].move_up
    @c.map(:name).must_equal %w[ def abc hig ]

    @c[:name => "abc"].move_down
    @c.map(:name).must_equal %w[ def hig abc ]

    @c[:name => "abc"].move_up(2)
    @c.map(:name).must_equal %w[ abc def hig ]

    @c[:name => "abc"].move_down(2)
    @c.map(:name).must_equal %w[ def hig abc ]

    @c[:name => "abc"].move_up(10)
    @c.map(:name).must_equal %w[ abc def hig ]
    @c[:name => "abc"].move_down(10)
    @c.map(:name).must_equal %w[ def hig abc ]
  end

  it "should update positions on destroy" do
    @c[:name => "def"].destroy
    @c.select_map([:position, :name]).must_equal [[1, 'abc'], [2, 'hig']]
  end
end

describe "List plugin with a scope" do
  before(:all) do
    @db = DB
    @db.create_table!(:pages) do
      primary_key :id
      String :name
      Integer :pos
      Integer :parent_id
    end

    @c = Class.new(Sequel::Model(@db[:pages]))
    @c.plugin :list, :field => :pos, :scope => :parent_id
  end
  before do
    @c.dataset.delete
    p1 = @c.create :name => "Hm", :parent_id => 0
    p2 = @c.create :name => "Ps", :parent_id => p1.id
    @c.create :name => "P1", :parent_id => p2.id
    @c.create :name => "P2", :parent_id => p2.id
    @c.create :name => "P3", :parent_id => p2.id
    @c.create :name => "Au", :parent_id => p1.id
  end
  after(:all) do
    @db.drop_table?(:pages)
  end

  it "should return rows in order of position" do
    @c.map(:name).must_equal %w[ Hm Ps Au P1 P2 P3 ]
  end

  it "should define prev and next" do
    @c[:name => "Ps"].next.name.must_equal 'Au'
    @c[:name => "Au"].prev.name.must_equal 'Ps'
    @c[:name => "P1"].next.name.must_equal 'P2'
    @c[:name => "P2"].prev.name.must_equal 'P1'

    @c[:name => "P1"].next(2).name.must_equal 'P3'
    @c[:name => "P2"].next(-1).name.must_equal 'P1'
    @c[:name => "P3"].prev(2).name.must_equal 'P1'
    @c[:name => "P2"].prev(-1).name.must_equal 'P3'

    @c[:name => "Ps"].prev.must_be_nil
    @c[:name => "Au"].next.must_be_nil
    @c[:name => "P1"].prev.must_be_nil
    @c[:name => "P3"].next.must_be_nil
  end

  it "should define move_to" do
    @c[:name => "P2"].move_to(1)
    @c.map(:name).must_equal %w[ Hm Ps Au P2 P1 P3 ]

    @c[:name => "P2"].move_to(3)
    @c.map(:name).must_equal %w[ Hm Ps Au P1 P3 P2 ]

    @c[:name => "P2"].move_to(-1)
    @c.map(:name).must_equal %w[ Hm Ps Au P2 P1 P3 ]
    @c[:name => "P2"].move_to(10)
    @c.map(:name).must_equal %w[ Hm Ps Au P1 P3 P2 ]
  end

  it "should define move_to_top and move_to_bottom" do
    @c[:name => "Au"].move_to_top
    @c.map(:name).must_equal %w[ Hm Au Ps P1 P2 P3 ]

    @c[:name => "Au"].move_to_bottom
    @c.map(:name).must_equal %w[ Hm Ps Au P1 P2 P3 ]
  end

  it "should define move_up and move_down" do
    @c[:name => "P2"].move_up
    @c.map(:name).must_equal %w[ Hm Ps Au P2 P1 P3 ]

    @c[:name => "P1"].move_down
    @c.map(:name).must_equal %w[ Hm Ps Au P2 P3 P1 ]

    @c[:name => "P1"].move_up(10)
    @c.map(:name).must_equal %w[ Hm Ps Au P1 P2 P3 ]
    @c[:name => "P1"].move_down(10)
    @c.map(:name).must_equal %w[ Hm Ps Au P2 P3 P1 ]
  end

  it "should update positions on destroy" do
    @c[:name => "P2"].destroy
    @c.select_order_map([:pos, :name]).must_equal [[1, "Hm"], [1, "P1"], [1, "Ps"], [2, "Au"], [2, "P3"]]
  end
end

describe "Sequel::Plugins::Tree" do
  TreePluginSpecs = shared_description do
    it "should instantiate" do
      @Node.all.size.must_equal 12
    end

    it "should find all descendants of a node" do 
      @Node.find(:name => 'two').descendants.map{|m| m.name}.must_equal %w'two.one two.two two.three two.two.one'
    end

    it "should find all ancestors of a node" do 
      @Node.find(:name => "two.two.one").ancestors.map{|m| m.name}.must_equal %w'two.two two'
    end
    
    it "should find all siblings of a node, excepting self" do 
      @Node.find(:name=>"two.one").siblings.map{|m| m.name}.must_equal %w'two.two two.three'
    end

    it "should find all siblings of a node, including self" do 
      @Node.find(:name=>"two.one").self_and_siblings.map{|m| m.name}.must_equal %w'two.one two.two two.three'
    end

    it "should find siblings for root nodes" do 
      @Node.find(:name=>'three').self_and_siblings.map{|m| m.name}.must_equal %w'one two three four five'
    end

    it "should find correct root for a node" do
      @Node.find(:name=>"two.two.one").root.name.must_equal 'two'
      @Node.find(:name=>"three").root.name.must_equal 'three'
      @Node.find(:name=>"five.one").root.name.must_equal 'five'
    end

    it "iterate top-level nodes in order" do
      @Node.roots_dataset.count.must_equal 5
      @Node.roots.map(&:name).must_equal %w'one two three four five'
      @Node.where(:name=>%w'one two.one').roots_dataset.count.must_equal 1
      @Node.where(:name=>%w'one two.one').roots.map(&:name).must_equal %w'one'
    end
  
    it "should have children" do
      @Node.find(:name=>'one').children.map{|m| m.name}.must_equal %w'one.one one.two'
    end
  end

  describe "with simple key" do
    before(:all) do
      @db = DB
      @db.create_table!(:nodes) do
        Integer :id, :primary_key=>true
        String :name
        Integer :parent_id
        Integer :position 
      end

      @nodes = [{:id => 1, :name => 'one', :parent_id => nil, :position => 1}, 
        {:id => 2, :name => 'two', :parent_id => nil, :position => 2}, 
        {:id => 3, :name => 'three', :parent_id => nil, :position => 3}, 
        {:id => 4, :name => "two.one", :parent_id => 2, :position => 1},
        {:id => 5, :name => "two.two", :parent_id => 2, :position => 2},
        {:id => 6, :name => "two.two.one", :parent_id => 5, :position => 1},
        {:id => 7, :name => "one.two", :parent_id => 1, :position => 2},
        {:id => 8, :name => "one.one", :parent_id => 1, :position => 1},
        {:id => 9, :name => "five", :parent_id => nil, :position => 5},
        {:id => 10, :name => "four", :parent_id => nil, :position => 4},
        {:id => 11, :name => "five.one", :parent_id => 9, :position => 1},
        {:id => 12, :name => "two.three", :parent_id => 2, :position => 3}]
      @nodes.each{|node| @db[:nodes].insert(node)}

      @Node = Class.new(Sequel::Model(:nodes))
      @Node.plugin :tree, :order=>:position
    end
    after(:all) do
      @db.drop_table?(:nodes)
    end

    include TreePluginSpecs
  end

  describe "with composite key" do
    before(:all) do
      @db = DB
      @db.create_table!(:nodes) do
        Integer :id
        Integer :id2
        String :name
        Integer :parent_id
        Integer :parent_id2
        Integer :position 
        primary_key [:id, :id2]
      end

      @nodes = [{:id => 1, :id2=> 1, :name => 'one', :parent_id => nil, :parent_id2 => nil, :position => 1}, 
        {:id => 2, :id2=> 1,  :name => 'two', :parent_id => nil, :parent_id2 => nil, :position => 2}, 
        {:id => 1, :id2=> 2,  :name => 'three', :parent_id => nil, :parent_id2 => nil, :position => 3}, 
        {:id => 2, :id2=> 2,  :name => "two.one", :parent_id => 2, :parent_id2 => 1, :position => 1},
        {:id => 3, :id2=> 1,  :name => "two.two", :parent_id => 2, :parent_id2 => 1, :position => 2},
        {:id => 3, :id2=> 2,  :name => "two.two.one", :parent_id => 3, :parent_id2 => 1, :position => 1},
        {:id => 3, :id2=> 3,  :name => "one.two", :parent_id => 1, :parent_id2 => 1, :position => 2},
        {:id => 1, :id2=> 3,  :name => "one.one", :parent_id => 1, :parent_id2 => 1, :position => 1},
        {:id => 2, :id2=> 3,  :name => "five", :parent_id => nil, :parent_id2 => nil, :position => 5},
        {:id => 4, :id2=> 1,  :name => "four", :parent_id => nil, :parent_id2 => nil, :position => 4},
        {:id => 1, :id2=> 4,  :name => "five.one", :parent_id => 2, :parent_id2 => 3, :position => 1},
        {:id => 2, :id2=> 4,  :name => "two.three", :parent_id => 2, :parent_id2 => 1, :position => 3}]
      @nodes.each{|node| @db[:nodes].insert(node)}

      @Node = Class.new(Sequel::Model(:nodes))
      @Node.plugin :tree, :order=>:position, :key=>[:parent_id, :parent_id2]
    end
    after(:all) do
      @db.drop_table?(:nodes)
    end

    include TreePluginSpecs
  end
end

describe "Sequel::Plugins::UpdateRefresh" do
  before(:all) do
    @db = DB
    @db.create_table!(:tests) do
      primary_key :id
      String :name
      Integer :i
    end
    @c = Class.new(Sequel::Model(@db[:tests]))
    @c.plugin :update_refresh
  end
  before do
    @c.dataset.delete
    @foo = @c.create(:name=>'foo', :i=>10)
  end
  after(:all) do
    @db.drop_table?(:tests)
  end

  it "should refresh when updating" do 
    @foo.this.update(:i=>20)
    @foo.update(:name=>'bar')
    @foo.name.must_equal 'bar'
    @foo.i.must_equal 20
  end
end

describe "Sequel::Plugins::PreparedStatements" do
  before(:all) do
    @db = DB
    @db.create_table!(:ps_test) do
      primary_key :id
      String :name
      Integer :i
    end
    @c = Class.new(Sequel::Model(@db[:ps_test]))
  end
  before do
    @c.dataset.delete
    @foo = @c.create(:name=>'foo', :i=>10)
    @bar = @c.create(:name=>'bar', :i=>20)
  end
  after(:all) do
    @db.drop_table?(:ps_test)
  end

  it "should work with looking up using Model.[]" do 
    @c[@foo.id].must_equal @foo
    @c[@bar.id].must_equal @bar
    @c[0].must_be_nil
    @c[nil].must_be_nil
  end

  it "should work with looking up using Dataset#with_pk" do 
    @c.dataset.with_pk(@foo.id).must_equal @foo
    @c.dataset.with_pk(@bar.id).must_equal @bar
    @c.dataset.with_pk(0).must_be_nil
    @c.dataset.with_pk(nil).must_be_nil

    @c.dataset.filter(:i=>0).with_pk(@foo.id).must_be_nil
    @c.dataset.filter(:i=>10).with_pk(@foo.id).must_equal @foo
    @c.dataset.filter(:i=>20).with_pk(@bar.id).must_equal @bar
    @c.dataset.filter(:i=>10).with_pk(nil).must_be_nil
    @c.dataset.filter(:name=>'foo').with_pk(@foo.id).must_equal @foo
    @c.dataset.filter(:name=>'bar').with_pk(@bar.id).must_equal @bar
    @c.dataset.filter(:name=>'baz').with_pk(@bar.id).must_be_nil
    @c.dataset.filter(:name=>'bar').with_pk(nil).must_be_nil
  end

  it "should work with Model#destroy" do 
    @foo.destroy
    @bar.destroy
    @c[@foo.id].must_be_nil
    @c[@bar.id].must_be_nil
  end

  it "should work with Model#update" do 
    @foo.update(:name=>'foo2', :i=>30)
    @c[@foo.id].must_equal @c.load(:id=>@foo.id, :name=>'foo2', :i=>30)
    @foo.update(:name=>'foo3')
    @c[@foo.id].must_equal @c.load(:id=>@foo.id, :name=>'foo3', :i=>30)
    @foo.update(:i=>40)
    @c[@foo.id].must_equal @c.load(:id=>@foo.id, :name=>'foo3', :i=>40)
    @foo.update(:i=>nil)
    @c[@foo.id].must_equal @c.load(:id=>@foo.id, :name=>'foo3', :i=>nil)
  end

  it "should work with Model#create" do 
    o = @c.create(:name=>'foo2', :i=>30)
    @c[o.id].must_equal @c.load(:id=>o.id, :name=>'foo2', :i=>30)
    o = @c.create(:name=>'foo2')
    @c[o.id].must_equal @c.load(:id=>o.id, :name=>'foo2', :i=>nil)
    o = @c.create(:i=>30)
    @c[o.id].must_equal @c.load(:id=>o.id, :name=>nil, :i=>30)
    o = @c.create(:name=>nil, :i=>40)
    @c[o.id].must_equal @c.load(:id=>o.id, :name=>nil, :i=>40)
  end
end

describe "Sequel::Plugins::PreparedStatements with schema changes" do
  before do
    @db = DB
    @db.create_table!(:ps_test) do
      primary_key :id
      String :name
    end
    @c = Class.new(Sequel::Model(@db[:ps_test]))
    @c.many_to_one :ps_test, :key=>:id, :class=>@c
    @c.one_to_many :ps_tests, :key=>:id, :class=>@c
    @c.many_to_many :mps_tests, :left_key=>:id, :right_key=>:id, :class=>@c, :join_table=>Sequel[:ps_test].as(:x)
    @c.plugin :prepared_statements
  end
  after do
    @db.drop_table?(:ps_test)
  end

  it "should handle added columns" do 
    foo = @c.create(:name=>'foo')
    @c[foo.id].name.must_equal 'foo'
    foo.ps_test.name.must_equal 'foo'
    foo.ps_tests.map{|x| x.name}.must_equal %w'foo'
    foo.mps_tests.map{|x| x.name}.must_equal %w'foo'
    foo.update(:name=>'foo2')
    @c[foo.id].name.must_equal 'foo2'
    foo.delete
    foo.exists?.must_equal false

    @db.alter_table(:ps_test){add_column :i, Integer}

    foo = @c.create(:name=>'foo')
    @c[foo.id].name.must_equal 'foo'
    foo.ps_test.name.must_equal 'foo'
    foo.ps_tests.map{|x| x.name}.must_equal %w'foo'
    foo.mps_tests.map{|x| x.name}.must_equal %w'foo'
    foo.update(:name=>'foo2')
    @c[foo.id].name.must_equal 'foo2'
    foo.delete
    foo.exists?.must_equal false
  end
end

describe "Caching plugins" do
  before(:all) do
    @db = DB
    @db.drop_table?(:albums, :artists)
    @db.create_table(:artists) do
      primary_key :id
    end
    @db.create_table(:albums) do
      primary_key :id
      foreign_key :artist_id, :artists
    end
    @db[:artists].insert
    @db[:albums].insert(:artist_id=>1)
  end
  before do
    @Album = Class.new(Sequel::Model(@db[:albums]))
  end
  after(:all) do
    @db.drop_table?(:albums, :artists)
  end

  CachingPluginSpecs = shared_description do
    it "should work with looking up using Model.[]" do 
      @Artist[1].must_be_same_as(@Artist[1])
      @Artist[:id=>1].must_equal @Artist[1]
      @Artist[0].must_be_nil
      @Artist[nil].must_be_nil
    end

    it "should work with lookup up many_to_one associated objects" do 
      a = @Artist[1]
      @Album.first.artist.must_be_same_as(a)
    end
  end

  describe "caching plugin" do
    before do
      @cache_class = Class.new(Hash) do
        def set(k, v, ttl) self[k] = v end
        alias get []
      end
      @cache = @cache_class.new

      @Artist = Class.new(Sequel::Model(@db[:artists]))
      @Artist.plugin :caching, @cache
      @Album.many_to_one :artist, :class=>@Artist
    end

    include CachingPluginSpecs
  end

  describe "static_cache plugin" do
    before do
      @Artist = Class.new(Sequel::Model(@db[:artists]))
      @Artist.plugin :static_cache
      @Album.many_to_one :artist, :class=>@Artist
    end

    include CachingPluginSpecs

    it "should have first retrieve correct values" do 
      @Artist.first.must_equal @Artist.load(:id=>1)
      @Artist.first(1).must_equal [@Artist.load(:id=>1)]
      @Artist.first(:id=>1).must_equal @Artist.load(:id=>1)
      @Artist.first{id =~ 1}.must_equal @Artist.load(:id=>1)
    end
  end
end

describe "Sequel::Plugins::ConstraintValidations" do
  before(:all) do
    @db = DB
    @db.extension(:constraint_validations) unless @db.frozen?
    @db.drop_table?(:sequel_constraint_validations)
    @db.create_constraint_validations_table
    @ds = @db[:cv_test]
    @regexp = regexp = @db.dataset.supports_regexp?
    @validation_opts = {}
    opts_proc = proc{@validation_opts}
    @validate_block = proc do |opts|
      opts = opts_proc.call
      presence :pre, opts.merge(:name=>:p)
      exact_length 5, :exactlen, opts.merge(:name=>:el)
      min_length 5, :minlen, opts.merge(:name=>:minl)
      max_length 5, :maxlen, opts.merge(:name=>:maxl)
      length_range 3..5, :lenrange, opts.merge(:name=>:lr)
      if regexp
        format(/^foo\d+/, :form, opts.merge(:name=>:f))
      end
      like 'foo%', :lik, opts.merge(:name=>:l)
      ilike 'foo%', :ilik, opts.merge(:name=>:il)
      includes %w'abc def', :inc, opts.merge(:name=>:i)
      unique :uniq, opts.merge(:name=>:u)
      max_length 6, :minlen, opts.merge(:name=>:maxl2)
      operator :<, 'm', :exactlen, opts.merge(:name=>:lt)
      operator :>=, 5, :num, opts.merge(:name=>:gte)
      presence [:m1, :m2, :m3], opts.merge(:name=>:pm)
    end
    @valid_row = {:pre=>'a', :exactlen=>'12345', :minlen=>'12345', :maxlen=>'12345', :lenrange=>'1234', :lik=>'fooabc', :ilik=>'FooABC', :inc=>'abc', :uniq=>'u', :num=>5, :m1=>'a', :m2=>1, :m3=>'a'}
    @violations = [
      [:pre, [nil, '', ' ']],
      [:exactlen, [nil, '', '1234', '123456', 'n1234']],
      [:minlen, [nil, '', '1234']],
      [:maxlen, [nil, '123456']],
      [:lenrange, [nil, '', '12', '123456']],
      [:lik, [nil, '', 'fo', 'fotabc', 'FOOABC']],
      [:ilik, [nil, '', 'fo', 'fotabc']],
      [:inc, [nil, '', 'ab', 'abcd']],
      [:num, [nil, 3, 4]],
    ]

    if @regexp
      @valid_row[:form] = 'foo1'
      @violations << [:form, [nil, '', 'foo', 'fooa']]
    end
  end
  after(:all) do
    @db.drop_constraint_validations_table
  end

  ConstraintValidationsSpecs = shared_description do
    cspecify "should set up constraints that work even outside the model", [proc{|db| !db.mariadb? || db.server_version <= 100200}, :mysql] do 
      @ds.insert(@valid_row)

      # Test for unique constraint
      proc{@ds.insert(@valid_row)}.must_raise(Sequel::DatabaseError)

      @ds.delete
      @violations.each do |col, vals|
        try = @valid_row.dup
        vals += ['1234567'] if col == :minlen
        vals.each do |val|
          next if val.nil? && @validation_opts[:allow_nil]
          next if val == '' && @validation_opts[:allow_nil] && @db.database_type == :oracle
          try[col] = val
          proc{@ds.insert(try)}.must_raise(Sequel::DatabaseError)
        end
      end

      try = @valid_row.dup
      if @validation_opts[:allow_nil]
        [:m1, :m2, :m3].each do |c|
          @ds.insert(try.merge(c=>nil))
          @ds.delete
        end
        @ds.insert(try.merge(:m1=>nil, :m2=>nil))
        @ds.delete
        @ds.insert(try.merge(:m1=>nil, :m3=>nil))
        @ds.delete
        @ds.insert(try.merge(:m2=>nil, :m3=>nil))
        @ds.delete
        @ds.insert(try.merge(:m1=>nil, :m2=>nil, :m3=>nil))
        @ds.delete
      else
        [:m1, :m2, :m3].each do |c|
          proc{@ds.insert(try.merge(c=>nil))}.must_raise(Sequel::DatabaseError)
        end
        proc{@ds.insert(try.merge(:m1=>nil, :m2=>nil))}.must_raise(Sequel::DatabaseError)
        proc{@ds.insert(try.merge(:m1=>nil, :m3=>nil))}.must_raise(Sequel::DatabaseError)
        proc{@ds.insert(try.merge(:m2=>nil, :m3=>nil))}.must_raise(Sequel::DatabaseError)
        proc{@ds.insert(try.merge(:m1=>nil, :m2=>nil, :m3=>nil))}.must_raise(Sequel::DatabaseError)
      end

      unless @db.database_type == :oracle
        [:m1,  :m3].each do |c|
          proc{@ds.insert(try.merge(c=>''))}.must_raise(Sequel::DatabaseError)
        end
        proc{@ds.insert(try.merge(:m1=>'', :m3=>''))}.must_raise(Sequel::DatabaseError)
        proc{@ds.insert(try.merge(:m1=>'', :m2=>nil))}.must_raise(Sequel::DatabaseError)
        proc{@ds.insert(try.merge(:m1=>nil, :m3=>''))}.must_raise(Sequel::DatabaseError)
        proc{@ds.insert(try.merge(:m2=>nil, :m3=>''))}.must_raise(Sequel::DatabaseError)
        proc{@ds.insert(try.merge(:m1=>'', :m2=>nil, :m3=>''))}.must_raise(Sequel::DatabaseError)
      end

      # Test for dropping of constraint
      @db.alter_table(:cv_test){validate{drop :maxl2}}
      @ds.insert(@valid_row.merge(:minlen=>'1234567'))
    end

    it "should set up automatic validations inside the model" do 
      skip if @db.frozen?
      c = Class.new(Sequel::Model(@ds))
      c.plugin :constraint_validations
      c.dataset.delete
      c.create(@valid_row)

      # Test for unique validation 
      c.new(@valid_row).wont_be :valid?

      c.dataset.delete
      @violations.each do |col, vals|
        try = @valid_row.dup
        vals.each do |val|
          next if val.nil? && @validation_opts[:allow_nil]
          try[col] = val
          c.new(try).wont_be :valid?
        end
      end

      try = @valid_row.dup
      if @validation_opts[:allow_nil]
        [:m1, :m2, :m3].each do |col|
          c.new(try.merge(col=>nil)).must_be :valid?
        end
        c.new(try.merge(:m1=>nil, :m2=>nil)).must_be :valid?
        c.new(try.merge(:m1=>nil, :m3=>nil)).must_be :valid?
        c.new(try.merge(:m2=>nil, :m3=>nil)).must_be :valid?
        c.new(try.merge(:m1=>nil, :m2=>nil, :m3=>nil)).must_be :valid?
      else
        [:m1, :m2, :m3].each do |col|
          c.new(try.merge(col=>nil)).wont_be :valid?
        end
        c.new(try.merge(:m1=>nil, :m2=>nil)).wont_be :valid?
        c.new(try.merge(:m1=>nil, :m3=>nil)).wont_be :valid?
        c.new(try.merge(:m2=>nil, :m3=>nil)).wont_be :valid?
        c.new(try.merge(:m1=>nil, :m2=>nil, :m3=>nil)).wont_be :valid?
      end
      c.new(try.merge(:m1=>'', :m2=>nil)).wont_be :valid?
      c.new(try.merge(:m1=>nil, :m3=>'')).wont_be :valid?
      c.new(try.merge(:m2=>nil, :m3=>'')).wont_be :valid?
      c.new(try.merge(:m1=>'', :m2=>nil, :m3=>'')).wont_be :valid?
      [:m1,  :m3].each do |col|
        c.new(try.merge(col=>'')).wont_be :valid?
      end
      c.new(try.merge(:m1=>'', :m3=>'')).wont_be :valid?

      c.db.constraint_validations = nil
    end
  end

  describe "via create_table" do
    before(:all) do
      @table_block = proc do
        regexp = @regexp
        validate_block = @validate_block
        @db.create_table!(:cv_test) do
          primary_key :id
          String :pre
          String :exactlen
          String :minlen
          String :maxlen
          String :lenrange
          if regexp
            String :form
          end
          String :lik
          String :ilik
          String :inc
          String :uniq, :null=>false
          Integer :num
          String :m1
          Integer :m2
          String :m3
          validate(&validate_block)
        end
      end
    end
    after(:all) do
      @db.drop_table?(:cv_test)
      @db.drop_constraint_validations_for(:table=>:cv_test)
    end

    describe "with :allow_nil=>true" do
      before(:all) do
        @validation_opts = {:allow_nil=>true}
        @table_block.call
      end
      include ConstraintValidationsSpecs
    end
    describe "with :allow_nil=>false" do
      before(:all) do
        @table_block.call
      end
      include ConstraintValidationsSpecs
    end
  end

  describe "via alter_table" do
    before(:all) do
      @table_block = proc do
        regexp = @regexp
        validate_block = @validate_block
        @db.create_table!(:cv_test) do
          primary_key :id
          String :lik
          String :ilik
          String :inc
          String :uniq, :null=>false
        end
        @db.alter_table(:cv_test) do
          add_column :pre, String
          add_column :exactlen, String
          add_column :minlen, String
          add_column :maxlen, String
          add_column :lenrange, String
          if regexp
            add_column :form, String
          end
          add_column :num, Integer
          add_column :m1, String
          add_column :m2, Integer
          add_column :m3, String
          validate(&validate_block)
        end
      end
    end
    after(:all) do
      @db.drop_table?(:cv_test)
      @db.drop_constraint_validations_for(:table=>:cv_test)
    end

    describe "with :allow_nil=>true" do
      before(:all) do
        @validation_opts = {:allow_nil=>true}
        @table_block.call
      end
      include ConstraintValidationsSpecs
    end
    describe "with :allow_nil=>false" do
      before(:all) do
        @table_block.call
      end
      include ConstraintValidationsSpecs
    end
  end
end

describe "date_arithmetic extension" do
  asd = begin
    require 'active_support/duration'
    require 'active_support/inflector'
    require 'active_support/core_ext/string/inflections'
    true
  rescue LoadError
    false
  end

  before(:all) do
    @db = DB
    @db.extension(:date_arithmetic) unless @db.frozen?
    skip if @db.database_type == :sqlite && @db.frozen?
    if @db.database_type == :sqlite
      @db.use_timestamp_timezones = false
    end
    @date = Date.civil(2010, 7, 12)
    @dt = Time.local(2010, 7, 12)
    if asd
      @d0 = ActiveSupport::Duration.new(0, [[:days, 0]])
      @d1 = ActiveSupport::Duration.new(1, [[:days, 1]])
      @d2 = ActiveSupport::Duration.new(1, [[:years, 1], [:months, 1], [:days, 1], [:minutes, 61], [:seconds, 1]])
    end
    @h0 = {:days=>0}
    @h1 = {:days=>1, :years=>nil, :hours=>0}
    @h2 = {:years=>1, :months=>1, :days=>1, :hours=>1, :minutes=>1, :seconds=>1}
    @a1 = Time.local(2010, 7, 13)
    @a2 = Time.local(2011, 8, 13, 1, 1, 1)
    @s1 = Time.local(2010, 7, 11)
    @s2 = Time.local(2009, 6, 10, 22, 58, 59)
    @check = lambda do |meth, in_date, in_interval, should|
      output = @db.get(Sequel.send(meth, in_date, in_interval))
      output = Time.parse(output.to_s) unless output.is_a?(Time) || output.is_a?(DateTime)
      output.year.must_equal should.year
      output.month.must_equal should.month
      output.day.must_equal should.day
      output.hour.must_equal should.hour
      output.min.must_equal should.min
      output.sec.must_equal should.sec
    end
  end
  after(:all) do
    if @db.database_type == :sqlite
      @db.use_timestamp_timezones = true
    end
  end

  if asd
    it "be able to use Sequel.date_add to add ActiveSupport::Duration objects to dates and datetimes" do
      @check.call(:date_add, @date, @d0, @dt)
      @check.call(:date_add, @date, @d1, @a1)
      @check.call(:date_add, @date, @d2, @a2)

      @check.call(:date_add, @dt, @d0, @dt)
      @check.call(:date_add, @dt, @d1, @a1)
      @check.call(:date_add, @dt, @d2, @a2)
    end

    it "be able to use Sequel.date_sub to subtract ActiveSupport::Duration objects from dates and datetimes" do
      @check.call(:date_sub, @date, @d0, @dt)
      @check.call(:date_sub, @date, @d1, @s1)
      @check.call(:date_sub, @date, @d2, @s2)

      @check.call(:date_sub, @dt, @d0, @dt)
      @check.call(:date_sub, @dt, @d1, @s1)
      @check.call(:date_sub, @dt, @d2, @s2)
    end
  end

  it "be able to use Sequel.date_add to add interval hashes to dates and datetimes" do
    @check.call(:date_add, @date, @h0, @dt)
    @check.call(:date_add, @date, @h1, @a1)
    @check.call(:date_add, @date, @h2, @a2)

    @check.call(:date_add, @dt, @h0, @dt)
    @check.call(:date_add, @dt, @h1, @a1)
    @check.call(:date_add, @dt, @h2, @a2)
  end

  it "be able to use Sequel.date_sub to subtract interval hashes from dates and datetimes" do
    @check.call(:date_sub, @date, @h0, @dt)
    @check.call(:date_sub, @date, @h1, @s1)
    @check.call(:date_sub, @date, @h2, @s2)

    @check.call(:date_sub, @dt, @h0, @dt)
    @check.call(:date_sub, @dt, @h1, @s1)
    @check.call(:date_sub, @dt, @h2, @s2)
  end
end

describe "string_agg extension" do
  before(:all) do
    @db = DB
    @db.extension(:string_agg) unless @db.frozen?
    @db.create_table!(:string_agg_test) do
      Integer :id
      String :s
      Integer :o
    end
    @db[:string_agg_test].import([:id, :s, :o], [[1, 'a', 3], [1, 'a', 3], [1, 'b', 5], [1, 'c', 4], [2, 'aa', 2], [2, 'bb', 1]])
    @ds = @db[:string_agg_test].select_group(:id).order(:id)
  end
  after(:all) do
    @db.drop_table?(:string_agg_test)
  end

  cspecify "should have string_agg return aggregated concatenation", :mssql, :sqlite, :derby do
    h = @ds.select_append(Sequel.string_agg(:s).as(:v)).to_hash(:id, :v)
    h[1].must_match(/\A[abc],[abc],[abc],[abc]\z/)
    h[2].must_match(/\A(aa|bb),(aa|bb)\z/)

    @ds.select_append(Sequel.string_agg(:s).order(:o).as(:v)).map([:id, :v]).must_equal [[1, 'a,a,c,b'], [2, 'bb,aa']]
    @ds.select_append(Sequel.string_agg(:s, '-').order(:o).as(:v)).map([:id, :v]).must_equal [[1, 'a-a-c-b'], [2, 'bb-aa']]
  end

  cspecify "should have string_agg return aggregated concatenation for distinct values", :mssql, :sqlite, :oracle, :db2, :derby do
    @ds.select_group(:id).select_append(Sequel.string_agg(:s).order(:s).distinct.as(:v)).map([:id, :v]).must_equal [[1, 'a,b,c'], [2, 'aa,bb']]
  end
end if (DB.database_type != :postgres || DB.server_version >= 90000)

describe "insert_conflict plugin" do
  before(:all) do
    @db = DB
    @db.create_table!(:ic_test) do
      primary_key :id
      String :s, :unique=>true
      Integer :o
    end
    @model = Class.new(Sequel::Model)
    @model.set_dataset @db[:ic_test]
    @model.plugin :insert_conflict
  end
  after(:all) do
    @db.drop_table?(:ic_test)
  end

  it "should allow Model#insert_conflict to work" do
    ic_opts = {:target=>:s, :update => {:o => Sequel[:excluded][:o]}}
    @model.new(:s=>'A', :o=>1).insert_conflict(ic_opts).save
    @model.select_order_map([:s, :o]).must_equal [['A', 1]]
    @model.new(:s=>'A', :o=>2).insert_conflict(ic_opts).save
    @model.select_order_map([:s, :o]).must_equal [['A', 2]]
    @model.new(:s=>'B', :o=>3).insert_conflict(ic_opts).save
    @model.select_order_map([:s, :o]).must_equal [['A', 2], ['B', 3]]
  end
end if (DB.database_type == :postgres && DB.server_version >= 90500) || (DB.database_type == :sqlite && DB.sqlite_version >= 32400)
