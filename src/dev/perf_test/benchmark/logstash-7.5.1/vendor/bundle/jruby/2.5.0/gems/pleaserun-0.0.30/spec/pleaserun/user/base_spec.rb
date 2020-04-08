require "testenv"
require "pleaserun/user/base"
require "English"
require "etc"
require "stud/temporary"

describe PleaseRun::User::Base do
  subject(:user) { PleaseRun::User::Base.new }
  describe "defaults" do
    it "should fail validation because there is no name" do
      expect { user.validate }.to(raise_error(PleaseRun::Configurable::ValidationError))
    end
  end

  [:name, :platform, :version].each do |attribute|
    let(:method) { "#{attribute}=".to_sym }
    context "###{attribute}=" do
      let(:value) { Flores::Random.text(1..10) }
      it "accepts a string" do
        expect { user.send(method, value) }.not_to(raise_error)
      end
    end
  end

  # Things that can be set to nil
  [:version].each do |attribute|
    let(:method) { "#{attribute}=".to_sym }
    context "###{attribute}=" do
      let(:value) { nil }
      it "accepts nil" do
        expect { user.send(method, value) }.not_to(raise_error)
      end
    end
  end

  describe "rendering" do
    let(:platform) { "linux" }
    let(:name) { "example" }
    before do
      user.name = name
      user.platform = platform
    end

    [:name, :platform].each do |attribute|
      it "should have expected #{attribute}" do
        expected = send(attribute) # get the name, platform, whatever
        expect(user.send(attribute)).to(be == expected)
      end
    end

    it "should pass validation" do
      expect { user.validate }.not_to(raise_error)
    end

    context "#render_installer" do
      subject(:render) { user.render_installer }
      it "should be a String" do
        expect(render).to(be_a(String))
      end
    end

    context "#render_remover" do
      subject(:render) { user.render_remover }
      it "should be a String" do
        expect(render).to(be_a(String))
      end
    end
  end

  describe "integration", :if => superuser? do
    let(:platform) { "linux" }
    let(:name) { "example" }
    let(:installer) { Stud::Temporary.pathname }
    let(:remover) { Stud::Temporary.pathname }
    let(:userinfo) { Etc.getpwnam(name) }

    before do
      user.name = name
      user.platform = platform
      File.write(installer, user.render_installer)
      File.write(remover, user.render_remover)
    end

    after do
      File.unlink(remover)
      File.unlink(installer)
    end

    context "installer" do
      it "should create the user" do
        expect(system("sh", installer)).to(be_truthy)

        # Look up the user
        expect { userinfo }.not_to(raise_error)
        expect(userinfo.name).to(be == name)
      end
    end

    context "remover" do
      before do
        system("sh", installer)
      end
      it "should remove the user" do
        system("sh", remover)
        # User lookup should fail because the user doesn't exist
        expect { userinfo }.to(raise_error(ArgumentError))
      end
    end

    after do
      # Ensure the user is gone after the test.
      system("userdel #{name} > /dev/null 2>&1")
    end

  end
end
