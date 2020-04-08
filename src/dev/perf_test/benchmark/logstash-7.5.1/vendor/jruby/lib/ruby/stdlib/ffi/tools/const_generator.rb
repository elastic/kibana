require 'tmpdir'
require 'tempfile'
require 'open3'

module FFI

  ##
  # ConstGenerator turns C constants into ruby values.

  class ConstGenerator
    @options = {}
    attr_reader :constants

    ##
    # Creates a new constant generator that uses +prefix+ as a name, and an
    # options hash.
    #
    # The only option is :required, which if set to true raises an error if a
    # constant you have requested was not found.
    #
    # When passed a block, #calculate is automatically called at the end of
    # the block, otherwise you must call it yourself.

    def initialize(prefix = nil, options = {})
      @includes = []
      @constants = {}
      @prefix = prefix

      @required = options[:required]
      @options = options

      if block_given? then
        yield self
        calculate self.class.options.merge(options)
      end
    end
    def self.options=(options)
      @options = options
    end
    def self.options
      @options
    end
    def [](name)
      @constants[name].value
    end

    ##
    # Request the value for C constant +name+.  +format+ is a printf format
    # string to print the value out, and +cast+ is a C cast for the value.
    # +ruby_name+ allows you to give the constant an alternate ruby name for
    # #to_ruby.  +converter+ or +converter_proc+ allow you to convert the
    # value from a string to the appropriate type for #to_ruby.

    def const(name, format = nil, cast = '', ruby_name = nil, converter = nil,
              &converter_proc)
      format ||= '%d'
      cast ||= ''

      if converter_proc and converter then
        raise ArgumentError, "Supply only converter or converter block"
      end

      converter = converter_proc if converter.nil?

      const = Constant.new name, format, cast, ruby_name, converter
      @constants[name.to_s] = const
      return const
    end

    def calculate(options = {})
      binary = File.join Dir.tmpdir, "rb_const_gen_bin_#{Process.pid}"

      Tempfile.open("#{@prefix}.const_generator") do |f|
        f.puts "#include <stdio.h>"

        @includes.each do |inc|
          f.puts "#include <#{inc}>"
        end

        f.puts "#include <stddef.h>\n\n"
        f.puts "int main(int argc, char **argv)\n{"

        @constants.each_value do |const|
          f.puts <<-EOF
  #ifdef #{const.name}
  printf("#{const.name} #{const.format}\\n", #{const.cast}#{const.name});
  #endif
          EOF
        end

        f.puts "\n\treturn 0;\n}"
        f.flush

        output = `gcc #{options[:cppflags]} -D_DARWIN_USE_64_BIT_INODE -D_LARGEFILE_SOURCE -D_FILE_OFFSET_BITS=64 -x c -Wall -Werror #{f.path} -o #{binary} 2>&1`

        unless $?.success? then
          output = output.split("\n").map { |l| "\t#{l}" }.join "\n"
          raise "Compilation error generating constants #{@prefix}:\n#{output}"
        end
      end

      output = `#{binary}`
      File.unlink(binary + (FFI::Platform.windows? ? ".exe" : ""))
      output.each_line do |line|
        line =~ /^(\S+)\s(.*)$/
        const = @constants[$1]
        const.value = $2
      end

      missing_constants = @constants.select do |name, constant|
        constant.value.nil?
      end.map { |name,| name }

      if @required and not missing_constants.empty? then
        raise "Missing required constants for #{@prefix}: #{missing_constants.join ', '}"
      end
    end

    def dump_constants(io)
      @constants.each do |name, constant|
        name = [@prefix, name].join '.'
        io.puts "#{name} = #{constant.converted_value}"
      end
    end

    ##
    # Outputs values for discovered constants.  If the constant's value was
    # not discovered it is not omitted.

    def to_ruby
      @constants.sort_by { |name,| name }.map do |name, constant|
        if constant.value.nil? then
          "# #{name} not available"
        else
          constant.to_ruby
        end
      end.join "\n"
    end

    def include(i)
      @includes << i
    end

  end

  class ConstGenerator::Constant

    attr_reader :name, :format, :cast
    attr_accessor :value

    def initialize(name, format, cast, ruby_name = nil, converter=nil)
      @name = name
      @format = format
      @cast = cast
      @ruby_name = ruby_name
      @converter = converter
      @value = nil
    end

    def converted_value
      if @converter
        @converter.call(@value)
      else
        @value
      end
    end

    def ruby_name
      @ruby_name || @name
    end

    def to_ruby
      "#{ruby_name} = #{converted_value}"
    end

  end  

end
