require 'spec_helper'

RSpec.describe "Objects" do
  before do
    stub_dotfile!
  end

  after do
    Object.instance_eval{ remove_const :Hello } if defined?(Hello)
  end

  describe "Formatting an object" do
    it "attributes" do
      class Hello
        attr_reader   :abra
        attr_writer   :ca
        attr_accessor :dabra

        def initialize
          @abra, @ca, @dabra = 1, 2, 3
        end
      end

      hello = Hello.new
      out = hello.ai(:plain => true, :raw => true)
      str = <<-EOS.strip
#<Hello:placeholder_id
    attr_accessor :dabra = 3,
    attr_reader :abra = 1,
    attr_writer :ca = 2
>
EOS
      expect(out).to be_similar_to(str)
      expect(hello.ai(:plain => true, :raw => false)).to eq(hello.inspect)
    end

    it "instance variables" do
      class Hello
        def initialize
          @abra, @ca, @dabra = 1, 2, 3
        end
      end

      hello = Hello.new
      out = hello.ai(:plain => true, :raw => true)
      str = <<-EOS.strip
#<Hello:placeholder_id
    @abra = 1,
    @ca = 2,
    @dabra = 3
>
EOS
      expect(out).to be_similar_to(str)
      expect(hello.ai(:plain => true, :raw => false)).to eq(hello.inspect)
    end

    it "attributes and instance variables" do
      class Hello
        attr_reader   :abra
        attr_writer   :ca
        attr_accessor :dabra

        def initialize
          @abra, @ca, @dabra = 1, 2, 3
          @scooby, @dooby, @doo = 3, 2, 1
        end
      end

      hello = Hello.new
      out = hello.ai(:plain => true, :raw => true)
      str = <<-EOS.strip
#<Hello:placeholder_id
    @doo = 1,
    @dooby = 2,
    @scooby = 3,
    attr_accessor :dabra = 3,
    attr_reader :abra = 1,
    attr_writer :ca = 2
>
EOS
      expect(out).to be_similar_to(str)
      expect(hello.ai(:plain => true, :raw => false)).to eq(hello.inspect)
    end

    it "without the plain options print the colorized values" do
      class Hello
        attr_reader   :abra
        attr_writer   :ca

        def initialize
          @abra, @ca = 1, 2
          @dabra = 3
        end
      end

      hello = Hello.new
      out = hello.ai(:raw => true)
      str = <<-EOS.strip
#<Hello:placeholder_id
    \e[0;36m@dabra\e[0m\e[0;37m = \e[0m\e[1;34m3\e[0m,
    \e[1;36mattr_reader\e[0m \e[0;35m:abra\e[0m\e[0;37m = \e[0m\e[1;34m1\e[0m,
    \e[1;36mattr_writer\e[0m \e[0;35m:ca\e[0m\e[0;37m = \e[0m\e[1;34m2\e[0m
>
EOS
      expect(out).to be_similar_to(str)
      expect(hello.ai(:plain => true, :raw => false)).to eq(hello.inspect)
    end

    it "with multine as false show inline values" do
      class Hello
        attr_reader   :abra
        attr_writer   :ca

        def initialize
          @abra, @ca = 1, 2
          @dabra = 3
        end
      end

      hello = Hello.new
      out = hello.ai(:multiline => false, :plain => true, :raw => true)
      str = <<-EOS.strip
#<Hello:placeholder_id @dabra = 3, attr_reader :abra = 1, attr_writer :ca = 2>
EOS
      expect(out).to be_similar_to(str)
      expect(hello.ai(:plain => true, :raw => false)).to eq(hello.inspect)
    end
  end
end
