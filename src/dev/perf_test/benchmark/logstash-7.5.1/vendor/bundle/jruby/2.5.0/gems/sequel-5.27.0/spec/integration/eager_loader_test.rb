require_relative "spec_helper"

describe "Eagerly loading a tree structure" do
  before(:all) do
    DB.instance_variable_get(:@schemas).clear
    DB.create_table!(:nodes) do
      primary_key :id
      foreign_key :parent_id, :nodes
    end
    class ::Node < Sequel::Model
      many_to_one :parent
      one_to_many :children, :key=>:parent_id
    
      # Only useful when eager loading
      many_to_one :ancestors, :eager_loader_key=>nil, :eager_loader=>(proc do |eo|
        # Handle cases where the root node has the same parent_id as primary_key
        # and also when it is NULL
        non_root_nodes = eo[:rows].reject do |n| 
          if [nil, n.pk].include?(n.parent_id)
            # Make sure root nodes have their parent association set to nil
            n.associations[:parent] = nil
            true
          else
            false
          end
        end
        unless non_root_nodes.empty?
          id_map = {}
          # Create an map of parent_ids to nodes that have that parent id
          non_root_nodes.each{|n| (id_map[n.parent_id] ||= []) << n}
          # Doesn't cause an infinte loop, because when only the root node
          # is left, this is not called.
          Node.filter(Node.primary_key=>id_map.keys.sort).eager(:ancestors).all do |node|
            # Populate the parent association for each node
            id_map[node.pk].each{|n| n.associations[:parent] = node}
          end
        end
      end)
      many_to_one :descendants, :eager_loader_key=>nil, :eager_loader=>(proc do |eo|
        id_map = {}
        eo[:rows].each do |n|
          # Initialize an empty array of child associations for each parent node
          n.associations[:children] = []
          # Populate identity map of nodes
          id_map[n.pk] = n
        end
        # Doesn't cause an infinite loop, because the :eager_loader is not called
        # if no records are returned.  Exclude id = parent_id to avoid infinite loop
        # if the root note is one of the returned records and it has parent_id = id
        # instead of parent_id = NULL.
        Node.filter(:parent_id=>id_map.keys.sort).exclude(:id=>:parent_id).eager(:descendants).all do |node|
          # Get the parent from the identity map
          parent = id_map[node.parent_id]
          # Set the child's parent association to the parent 
          node.associations[:parent] = parent
          # Add the child association to the array of children in the parent
          parent.associations[:children] << node
        end
      end)
    end
    
    Node.insert(:parent_id=>1)
    Node.insert(:parent_id=>1)
    Node.insert(:parent_id=>1)
    Node.insert(:parent_id=>2)
    Node.insert(:parent_id=>4)
    Node.insert(:parent_id=>5)
    Node.insert(:parent_id=>6)
  end
  after(:all) do
    DB.drop_table :nodes
    Object.send(:remove_const, :Node)
  end

  it "#descendants should get all descendants in one call" do
    nodes = Node.filter(:id=>1).eager(:descendants).all
    nodes.length.must_equal 1
    node = nodes.first
    node.pk.must_equal 1
    node.children.length.must_equal 2
    node.children.collect{|x| x.pk}.sort.must_equal [2, 3]
    node.children.collect{|x| x.parent}.must_equal [node, node]
    node = nodes.first.children.find{|x| x.pk == 2}
    node.children.length.must_equal 1
    node.children.first.pk.must_equal 4
    node.children.first.parent.must_equal node
    node = node.children.first
    node.children.length.must_equal 1
    node.children.first.pk.must_equal 5
    node.children.first.parent.must_equal node
    node = node.children.first
    node.children.length.must_equal 1
    node.children.first.pk.must_equal 6
    node.children.first.parent.must_equal node
    node = node.children.first
    node.children.length.must_equal 1
    node.children.first.pk.must_equal 7
    node.children.first.parent.must_equal node
  end

  it "#ancestors should get all ancestors in one call" do
    nodes = Node.filter(:id=>[7,3]).order(:id).eager(:ancestors).all
    nodes.length.must_equal 2
    nodes.collect{|x| x.pk}.must_equal [3, 7]
    nodes.first.parent.pk.must_equal 1
    nodes.first.parent.parent.must_be_nil
    node = nodes.last
    node.parent.pk.must_equal 6
    node = node.parent
    node.parent.pk.must_equal 5
    node = node.parent
    node.parent.pk.must_equal 4
    node = node.parent
    node.parent.pk.must_equal 2
    node = node.parent
    node.parent.pk.must_equal 1
    node.parent.parent.must_be_nil
  end
end

describe "Association Extensions" do
  before do
    module ::FindOrCreate
      def find_or_create(vals)
        first(vals) || model.create(vals.merge(:author_id=>model_object.pk))
      end 
      def find_or_create_by_name(name)
        first(:name=>name) || model.create(:name=>name, :author_id=>model_object.pk)
      end
    end
    DB.instance_variable_get(:@schemas).clear
    DB.create_table!(:authors) do
      primary_key :id
    end
    class ::Author < Sequel::Model
      one_to_many :authorships, :extend=>FindOrCreate
    end
    DB.create_table!(:authorships) do
      primary_key :id
      foreign_key :author_id, :authors
      String :name
    end
    class ::Authorship < Sequel::Model
      many_to_one :author
    end
    @author = Author.create
  end
  after do
    DB.drop_table :authorships, :authors
    Object.send(:remove_const, :Author)
    Object.send(:remove_const, :Authorship)
  end

  it "should allow methods to be called on the dataset method" do
    Authorship.count.must_equal 0
    authorship = @author.authorships_dataset.find_or_create_by_name('Bob')
    Authorship.count.must_equal 1
    Authorship.first.must_equal authorship
    authorship.name.must_equal 'Bob'
    authorship.author_id.must_equal @author.id
    @author.authorships_dataset.find_or_create_by_name('Bob').must_equal authorship
    Authorship.count.must_equal 1
    authorship2 = @author.authorships_dataset.find_or_create(:name=>'Jim')
    Authorship.count.must_equal 2
    Authorship.order(:name).map(:name).must_equal ['Bob', 'Jim']
    authorship2.name.must_equal 'Jim'
    authorship2.author_id.must_equal @author.id
    @author.authorships_dataset.find_or_create(:name=>'Jim').must_equal authorship2
  end
end

describe "has_many :through has_many and has_one :through belongs_to" do
  before(:all) do
    DB.instance_variable_get(:@schemas).clear
    DB.create_table!(:firms) do
      primary_key :id
    end
    class ::Firm < Sequel::Model
      one_to_many :clients
      one_to_many :invoices, :read_only=>true, \
        :dataset=>proc{Invoice.eager_graph(:client).filter(Sequel[:client][:firm_id]=>pk)}, \
        :after_load=>(proc do |firm, invs|
          invs.each do |inv|
            inv.client.associations[:firm] = inv.associations[:firm] = firm
          end
        end), \
        :eager_loader=>(proc do |eo|
          id_map = eo[:id_map]
          eo[:rows].each{|firm| firm.associations[:invoices] = []}
          Invoice.eager_graph(:client).filter(Sequel[:client][:firm_id]=>id_map.keys).all do |inv|
            id_map[inv.client.firm_id].each do |firm|
              firm.associations[:invoices] << inv
            end
          end
        end)
    end

    DB.create_table!(:clients) do
      primary_key :id
      foreign_key :firm_id, :firms
    end
    class ::Client < Sequel::Model
      many_to_one :firm
      one_to_many :invoices
    end

    DB.create_table!(:invoices) do
      primary_key :id
      foreign_key :client_id, :clients
    end
    class ::Invoice < Sequel::Model
      many_to_one :client
      many_to_one :firm, :key=>nil, :read_only=>true, \
        :dataset=>proc{Firm.eager_graph(:clients).filter(Sequel[:clients][:id]=>client_id)}, \
        :after_load=>(proc do |inv, firm|
          # Delete the cached associations from firm, because it only has the
          # client with this invoice, instead of all clients of the firm
          if c = firm.associations.delete(:clients)
            firm.associations[:invoice_client] = c.first
          end
          inv.associations[:client] ||= firm.associations[:invoice_client]
        end), \
        :eager_loader=>(proc do |eo|
          id_map = {}
          eo[:rows].each do |inv|
            inv.associations[:firm] = nil
            (id_map[inv.client_id] ||= []) << inv
          end
          Firm.eager_graph(:clients).filter(Sequel[:clients][:id]=>id_map.keys).all do |firm|
            # Delete the cached associations from firm, because it only has the
            # clients related the invoices being eagerly loaded, instead of all
            # clients of the firm.
            firm.associations[:clients].each do |client|
              id_map[client.pk].each do |inv|
                inv.associations[:firm] = firm
                inv.associations[:client] = client
              end
            end
          end
        end)
    end
    @firm1 = Firm.create
    @firm2 = Firm.create
    @client1 = Client.create(:firm => @firm1)
    @client2 = Client.create(:firm => @firm1)
    @client3 = Client.create(:firm => @firm2)
    @invoice1 = Invoice.create(:client => @client1)
    @invoice2 = Invoice.create(:client => @client1)
    @invoice3 = Invoice.create(:client => @client2)
    @invoice4 = Invoice.create(:client => @client3)
    @invoice5 = Invoice.create(:client => @client3)
  end
  after(:all) do
    DB.drop_table :invoices, :clients, :firms
    Object.send(:remove_const, :Firm)
    Object.send(:remove_const, :Client)
    Object.send(:remove_const, :Invoice)
  end

  it "should return has_many :through has_many records for a single object" do
    invs = @firm1.invoices.sort_by{|x| x.pk}
    invs.must_equal [@invoice1, @invoice2, @invoice3]
    invs[0].client.must_equal @client1
    invs[1].client.must_equal @client1
    invs[2].client.must_equal @client2
    invs.collect{|i| i.firm}.must_equal [@firm1, @firm1, @firm1]
    invs.collect{|i| i.client.firm}.must_equal [@firm1, @firm1, @firm1]
  end

  it "should eagerly load has_many :through has_many records for multiple objects" do
    firms = Firm.order(:id).eager(:invoices).all
    firms.must_equal [@firm1, @firm2]
    firm1, firm2 = firms
    invs1 = firm1.invoices.sort_by{|x| x.pk}
    invs2 = firm2.invoices.sort_by{|x| x.pk}
    invs1.must_equal [@invoice1, @invoice2, @invoice3]
    invs2.must_equal [@invoice4, @invoice5]
    invs1[0].client.must_equal @client1
    invs1[1].client.must_equal @client1
    invs1[2].client.must_equal @client2
    invs2[0].client.must_equal @client3
    invs2[1].client.must_equal @client3
    invs1.collect{|i| i.firm}.must_equal [@firm1, @firm1, @firm1]
    invs2.collect{|i| i.firm}.must_equal [@firm2, @firm2]
    invs1.collect{|i| i.client.firm}.must_equal [@firm1, @firm1, @firm1]
    invs2.collect{|i| i.client.firm}.must_equal [@firm2, @firm2]
  end

  it "should return has_one :through belongs_to records for a single object" do
    firm = @invoice1.firm
    firm.must_equal @firm1
    @invoice1.client.must_equal @client1
    @invoice1.client.firm.must_equal @firm1
    firm.associations[:clients].must_be_nil
  end

  it "should eagerly load has_one :through belongs_to records for multiple objects" do
    invs = Invoice.order(:id).eager(:firm).all
    invs.must_equal [@invoice1, @invoice2, @invoice3, @invoice4, @invoice5]
    invs[0].firm.must_equal @firm1
    invs[0].client.must_equal @client1
    invs[0].client.firm.must_equal @firm1
    invs[0].firm.associations[:clients].must_be_nil
    invs[1].firm.must_equal @firm1
    invs[1].client.must_equal @client1
    invs[1].client.firm.must_equal @firm1
    invs[1].firm.associations[:clients].must_be_nil
    invs[2].firm.must_equal @firm1
    invs[2].client.must_equal @client2
    invs[2].client.firm.must_equal @firm1
    invs[2].firm.associations[:clients].must_be_nil
    invs[3].firm.must_equal @firm2
    invs[3].client.must_equal @client3
    invs[3].client.firm.must_equal @firm2
    invs[3].firm.associations[:clients].must_be_nil
    invs[4].firm.must_equal @firm2
    invs[4].client.must_equal @client3
    invs[4].client.firm.must_equal @firm2
    invs[4].firm.associations[:clients].must_be_nil
  end
end

describe "Polymorphic Associations" do
  before(:all) do
    DB.instance_variable_get(:@schemas).clear
    DB.create_table!(:assets) do
      primary_key :id
      Integer :attachable_id
      String :attachable_type
    end
    class ::Asset < Sequel::Model
      m = method(:constantize)
      many_to_one :attachable, :reciprocal=>:assets, :reciprocal_type=>:one_to_many,
        :setter=>(proc do |attachable|
          self[:attachable_id] = (attachable.pk if attachable)
          self[:attachable_type] = (attachable.class.name if attachable)
        end),
        :dataset=>(proc do
          klass = m.call(attachable_type)
          klass.where(klass.primary_key=>attachable_id)
        end),
        :eager_loader=>(proc do |eo|
          id_map = {}
          eo[:rows].each do |asset|
            asset.associations[:attachable] = nil 
            ((id_map[asset.attachable_type] ||= {})[asset.attachable_id] ||= []) << asset
          end 
          id_map.each do |klass_name, idmap|
            klass = m.call(klass_name)
            klass.where(klass.primary_key=>idmap.keys).all do |attach|
              idmap[attach.pk].each do |asset|
                asset.associations[:attachable] = attach
              end 
            end 
          end 
        end)
    end 
  
    DB.create_table!(:posts) do
      primary_key :id
    end
    class ::Post < Sequel::Model
      one_to_many :assets, :key=>:attachable_id, :reciprocal=>:attachable, :conditions=>{:attachable_type=>'Post'},
        :adder=>proc{|asset| asset.update(:attachable_id=>pk, :attachable_type=>'Post')},
        :remover=>proc{|asset| asset.update(:attachable_id=>nil, :attachable_type=>nil)},
        :clearer=>proc{assets_dataset.update(:attachable_id=>nil, :attachable_type=>nil)}
    end 
  
    DB.create_table!(:notes) do
      primary_key :id
    end
    class ::Note < Sequel::Model
      one_to_many :assets, :key=>:attachable_id, :reciprocal=>:attachable, :conditions=>{:attachable_type=>'Note'},     
        :adder=>proc{|asset| asset.update(:attachable_id=>pk, :attachable_type=>'Note')},
        :remover=>proc{|asset| asset.update(:attachable_id=>nil, :attachable_type=>nil)},
        :clearer=>proc{assets_dataset.update(:attachable_id=>nil, :attachable_type=>nil)}
    end
  end
  before do
    [:assets, :posts, :notes].each{|t| DB[t].delete}
    @post = Post.create
    Note.create
    @note = Note.create
    @asset1 = Asset.create(:attachable=>@post)
    @asset2 = Asset.create(:attachable=>@note)
    @asset1.associations.clear
    @asset2.associations.clear
  end
  after(:all) do
    DB.drop_table :assets, :posts, :notes
    Object.send(:remove_const, :Asset)
    Object.send(:remove_const, :Post)
    Object.send(:remove_const, :Note)
  end

  it "should load the correct associated object for a single object" do
    @asset1.attachable.must_equal @post
    @asset2.attachable.must_equal @note
  end

  it "should eagerly load the correct associated object for a group of objects" do
    assets = Asset.order(:id).eager(:attachable).all
    assets.must_equal [@asset1, @asset2]
    assets[0].attachable.must_equal @post
    assets[1].attachable.must_equal @note
  end

  it "should set items correctly" do
    @asset1.attachable = @note
    @asset2.attachable = @post
    @asset1.attachable.must_equal @note
    @asset1.attachable_id.must_equal @note.pk
    @asset1.attachable_type.must_equal 'Note'
    @asset2.attachable.must_equal @post
    @asset2.attachable_id.must_equal @post.pk
    @asset2.attachable_type.must_equal 'Post'
    @asset1.attachable = nil
    @asset1.attachable.must_be_nil
    @asset1.attachable_id.must_be_nil
    @asset1.attachable_type.must_be_nil
  end

  it "should add items correctly" do
    @post.assets.must_equal [@asset1]
    @post.add_asset(@asset2)
    @post.assets.must_equal [@asset1, @asset2]
    @asset2.attachable.must_equal @post
    @asset2.attachable_id.must_equal @post.pk
    @asset2.attachable_type.must_equal 'Post'
  end

  it "should remove items correctly" do
    @note.assets.must_equal [@asset2]
    @note.remove_asset(@asset2)
    @note.assets.must_equal []
    @asset2.attachable.must_be_nil
    @asset2.attachable_id.must_be_nil
    @asset2.attachable_type.must_be_nil
  end

  it "should remove all items correctly" do
    @post.remove_all_assets
    @note.remove_all_assets
    @asset1.reload.attachable.must_be_nil
    @asset2.reload.attachable.must_be_nil
  end
end

describe "many_to_one/one_to_many not referencing primary key" do
  before(:all) do
    DB.instance_variable_get(:@schemas).clear
    DB.create_table!(:clients) do
      primary_key :id
      String :name
    end
    class ::Client < Sequel::Model
      one_to_many :invoices, :reciprocal=>:client,
        :adder=>(proc do |invoice|
          invoice.client_name = name
          invoice.save
        end),
        :remover=>(proc do |invoice|
          invoice.client_name = nil
          invoice.save
        end),
        :clearer=>proc{invoices_dataset.update(:client_name=>nil)},
        :dataset=>proc{Invoice.filter(:client_name=>name)},
        :eager_loader=>(proc do |eo|
          id_map = {}
          eo[:rows].each do |client|
            id_map[client.name] = client
            client.associations[:invoices] = []
          end 
          Invoice.filter(:client_name=>id_map.keys.sort).all do |inv|
            inv.associations[:client] = client = id_map[inv.client_name]
            client.associations[:invoices] << inv 
          end 
        end)
    end 
  
    DB.create_table!(:invoices) do
      primary_key :id
      String :client_name
    end
    class ::Invoice < Sequel::Model
      many_to_one :client, :key=>:client_name,
        :setter=>proc{|client| self.client_name = (client.name if client)},
        :dataset=>proc{Client.filter(:name=>client_name)},
        :eager_loader=>(proc do |eo|
          id_map = eo[:id_map]
          eo[:rows].each{|inv| inv.associations[:client] = nil}
          Client.filter(:name=>id_map.keys).all do |client|
            id_map[client.name].each{|inv| inv.associations[:client] = client}
          end 
        end)
    end
  end
  before do
    Client.dataset.delete
    Invoice.dataset.delete
    @client1 = Client.create(:name=>'X')
    @client2 = Client.create(:name=>'Y')
    @invoice1 = Invoice.create(:client_name=>'X')
    @invoice2 = Invoice.create(:client_name=>'X')
  end
  after(:all) do
    DB.drop_table :invoices, :clients
    Object.send(:remove_const, :Client)
    Object.send(:remove_const, :Invoice)
  end

  it "should load all associated one_to_many objects for a single object" do
    invs = @client1.invoices
    invs.sort_by{|x| x.pk}.must_equal [@invoice1, @invoice2]
    invs[0].client.must_equal @client1
    invs[1].client.must_equal @client1
  end

  it "should load the associated many_to_one object for a single object" do
    client = @invoice1.client
    client.must_equal @client1
  end

  it "should eagerly load all associated one_to_many objects for a group of objects" do
    clients = Client.order(:id).eager(:invoices).all
    clients.must_equal [@client1, @client2]
    clients[1].invoices.must_equal []
    invs = clients[0].invoices.sort_by{|x| x.pk}
    invs.must_equal [@invoice1, @invoice2]
    invs[0].client.must_equal @client1
    invs[1].client.must_equal @client1
  end

  it "should eagerly load the associated many_to_one object for a group of objects" do
    invoices = Invoice.order(:id).eager(:client).all
    invoices.must_equal [@invoice1, @invoice2]
    invoices[0].client.must_equal @client1
    invoices[1].client.must_equal @client1
  end

  it "should set the associated object correctly" do
    @invoice1.client = @client2
    @invoice1.client.must_equal @client2
    @invoice1.client_name.must_equal 'Y'
    @invoice1.client = nil
    @invoice1.client_name.must_be_nil
  end

  it "should add the associated object correctly" do
    @client2.invoices.must_equal []
    @client2.add_invoice(@invoice1)
    @client2.invoices.must_equal [@invoice1]
    @invoice1.client_name.must_equal 'Y'
    @invoice1.client = nil
    @invoice1.client_name.must_be_nil
  end

  it "should remove the associated object correctly" do
    invs = @client1.invoices.sort_by{|x| x.pk}
    invs.must_equal [@invoice1, @invoice2]
    @client1.remove_invoice(@invoice1)
    @client1.invoices.must_equal [@invoice2]
    @invoice1.client_name.must_be_nil
    @invoice1.client.must_be_nil
  end

  it "should remove all associated objects correctly" do
    @client1.remove_all_invoices
    @invoice1.refresh.client.must_be_nil
    @invoice1.client_name.must_be_nil
    @invoice2.refresh.client.must_be_nil
    @invoice2.client_name.must_be_nil
  end
end

describe "statistics associations" do
  before(:all) do
    DB.create_table!(:projects) do
      primary_key :id
      String :name
    end
    class ::Project < Sequel::Model
      many_to_one :ticket_hours, :read_only=>true, :key=>:id, :class=>:Ticket,
       :dataset=>proc{Ticket.filter(:project_id=>id).select{sum(hours).as(hours)}},
       :eager_loader=>(proc do |eo|
        eo[:rows].each{|p| p.associations[:ticket_hours] = nil}
        Ticket.filter(:project_id=>eo[:id_map].keys).
         select_group(:project_id).
         select_append{sum(hours).as(hours)}.
         all do |t|
          p = eo[:id_map][t.values.delete(:project_id)].first
          p.associations[:ticket_hours] = t
         end
       end)  
      def ticket_hours
        if s = super
          s[:hours]
        end
      end 
    end 

    DB.create_table!(:tickets) do
      primary_key :id
      foreign_key :project_id, :projects
      Integer :hours
    end
    class ::Ticket < Sequel::Model
      many_to_one :project
    end

    @project1 = Project.create(:name=>'X')
    @project2 = Project.create(:name=>'Y')
    @ticket1 = Ticket.create(:project=>@project1, :hours=>1)
    @ticket2 = Ticket.create(:project=>@project1, :hours=>10)
    @ticket3 = Ticket.create(:project=>@project2, :hours=>2)
    @ticket4 = Ticket.create(:project=>@project2, :hours=>20)
  end
  after(:all) do
    DB.drop_table :tickets, :projects
    Object.send(:remove_const, :Project)
    Object.send(:remove_const, :Ticket)
  end

  it "should give the correct sum of ticket hours for each project" do
    @project1.ticket_hours.to_i.must_equal 11
    @project2.ticket_hours.to_i.must_equal 22
  end

  it "should give the correct sum of ticket hours for each project when eager loading" do
    p1, p2 = Project.order(:name).eager(:ticket_hours).all
    p1.ticket_hours.to_i.must_equal 11
    p2.ticket_hours.to_i.must_equal 22
  end
end

describe "one to one associations" do
  before(:all) do
    DB.create_table!(:books) do
      primary_key :id
    end
    class ::Book < Sequel::Model
      one_to_one :first_page, :class=>:Page, :conditions=>{:page_number=>1}, :reciprocal=>nil
      one_to_one :second_page, :class=>:Page, :conditions=>{:page_number=>2}, :reciprocal=>nil
    end

    DB.create_table!(:pages) do
      primary_key :id
      foreign_key :book_id, :books
      Integer :page_number
    end
    class ::Page < Sequel::Model
      many_to_one :book, :reciprocal=>nil
    end

    @book1 = Book.create
    @book2 = Book.create
    @page1 = Page.create(:book=>@book1, :page_number=>1)
    @page2 = Page.create(:book=>@book1, :page_number=>2)
    @page3 = Page.create(:book=>@book2, :page_number=>1)
    @page4 = Page.create(:book=>@book2, :page_number=>2)
  end
  after(:all) do
    DB.drop_table :pages, :books
    Object.send(:remove_const, :Book)
    Object.send(:remove_const, :Page)
  end

  it "should be eager loadable" do
    bk1, bk2 = Book.filter(Sequel[:books][:id]=>[1,2]).eager(:first_page).all
    bk1.first_page.must_equal @page1
    bk2.first_page.must_equal @page3
  end

  it "should be eager graphable" do
    bk1, bk2 = Book.filter(Sequel[:books][:id]=>[1,2]).eager_graph(:first_page).all
    bk1.first_page.must_equal @page1
    bk2.first_page.must_equal @page3
  end

  it "should be eager graphable two at once" do
    bk1, bk2 = Book.filter(Sequel[:books][:id]=>[1,2]).eager_graph(:first_page, :second_page).all
    bk1.first_page.must_equal @page1
    bk1.second_page.must_equal @page2
    bk2.first_page.must_equal @page3
    bk2.second_page.must_equal @page4
  end
end
