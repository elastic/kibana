require 'fileutils'

module ChildProcess
  module Tools
    class Generator
      EXE_NAME         = "childprocess-sizeof-generator"
      TMP_PROGRAM      = "childprocess-sizeof-generator.c"
      DEFAULT_INCLUDES = %w[stdio.h stddef.h]

      def self.generate
        new.generate
      end

      def initialize
        @cc        = ENV['CC'] || 'gcc'
        @out       = File.expand_path("../../unix/platform/#{ChildProcess.platform_name}.rb", __FILE__)
        @sizeof    = {}
        @constants = {}
      end

      def generate
        fetch_size 'posix_spawn_file_actions_t', :include => "spawn.h"
        fetch_size 'posix_spawnattr_t', :include => "spawn.h"
        fetch_size 'sigset_t', :include => "signal.h"

        fetch_constant 'POSIX_SPAWN_RESETIDS',   :include  => 'spawn.h'
        fetch_constant 'POSIX_SPAWN_SETPGROUP',  :include  => 'spawn.h'
        fetch_constant 'POSIX_SPAWN_SETSIGDEF',  :include  => 'spawn.h'
        fetch_constant 'POSIX_SPAWN_SETSIGMASK', :include  => 'spawn.h'

        if ChildProcess.linux?
          fetch_constant 'POSIX_SPAWN_USEVFORK', :include => 'spawn.h', :define => {'_GNU_SOURCE' => nil}
        end

        write
      end

      def write
        FileUtils.mkdir_p(File.dirname(@out))
        File.open(@out, 'w') do |io|
          io.puts result
        end

        puts "wrote #{@out}"
      end

      def fetch_size(type_name, opts = {})
        print "sizeof(#{type_name}): "
        src = <<-EOF
int main() {
  printf("%d", (unsigned int)sizeof(#{type_name}));
  return 0;
}
        EOF

        output = execute(src, opts)

        if output.to_i < 1
          raise "sizeof(#{type_name}) == #{output.to_i} (output=#{output})"
        end

        size = output.to_i
        @sizeof[type_name] = size

        puts size
      end

      def fetch_constant(name, opts)
        print "#{name}: "
        src = <<-EOF
int main() {
  printf("%d", (unsigned int)#{name});
  return 0;
}
        EOF

        output = execute(src, opts)
        value  = Integer(output)
        @constants[name] = value

        puts value
      end


      def execute(src, opts)
        program = Array(opts[:define]).map do |key, value|
          <<-SRC
#ifndef #{key}
#define #{key} #{value}
#endif
          SRC
        end.join("\n")
        program << "\n"

        includes = Array(opts[:include]) + DEFAULT_INCLUDES
        program << includes.map { |include| "#include <#{include}>" }.join("\n")
        program << "\n#{src}"

        File.open(TMP_PROGRAM, 'w') do |file|
          file << program
        end

        cmd = "#{@cc} #{TMP_PROGRAM} -o #{EXE_NAME}"
        system cmd
        unless $?.success?
          raise "failed to compile program: #{cmd.inspect}\n#{program}"
        end

        output = `./#{EXE_NAME} 2>&1`

        unless $?.success?
          raise "failed to run program: #{cmd.inspect}\n#{output}"
        end

        output.chomp
      ensure
        File.delete TMP_PROGRAM if File.exist?(TMP_PROGRAM)
        File.delete EXE_NAME if File.exist?(EXE_NAME)
      end

      def result
        if @sizeof.empty? && @constants.empty?
          raise "no data collected, nothing to do"
        end

        out =  ['module ChildProcess::Unix::Platform']
        out << '  SIZEOF = {'

        max = @sizeof.keys.map { |e| e.length }.max
        @sizeof.each_with_index do |(type, size), idx|
          out << "     :#{type.ljust max} => #{size}#{',' unless idx == @sizeof.size - 1}"
        end
        out << '  }'

        max = @constants.keys.map { |e| e.length }.max
        @constants.each do |name, val|
          out << "  #{name.ljust max} = #{val}"
        end
        out << 'end'

        out.join "\n"
      end

    end
  end
end