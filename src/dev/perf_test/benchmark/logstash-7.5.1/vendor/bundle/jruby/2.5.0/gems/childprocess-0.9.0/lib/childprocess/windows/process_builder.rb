module ChildProcess
  module Windows
    class ProcessBuilder
      attr_accessor :leader, :detach, :duplex, :environment, :stdout, :stderr, :cwd
      attr_reader :stdin

      def initialize(args)
        @args        = args

        @detach      = false
        @duplex      = false
        @environment = nil
        @cwd         = nil

        @stdout      = nil
        @stderr      = nil
        @stdin       = nil

        @flags       = 0
        @job_ptr     = nil
        @cmd_ptr     = nil
        @env_ptr     = nil
        @cwd_ptr     = nil
      end

      def start
        create_command_pointer
        create_environment_pointer
        create_cwd_pointer

        setup_flags
        setup_io

        pid = create_process
        close_handles

        pid
      end

      private

      def create_command_pointer
        string = @args.map { |arg| quote_if_necessary(arg.to_s) }.join ' '
        @cmd_ptr = FFI::MemoryPointer.from_string string
      end

      def create_environment_pointer
        return unless @environment.kind_of?(Hash) && @environment.any?

        strings = []

        ENV.to_hash.merge(@environment).each do |key, val|
          next if val.nil?

          if key.to_s =~ /=|\0/ || val.to_s.include?("\0")
            raise InvalidEnvironmentVariable, "#{key.inspect} => #{val.inspect}"
          end

          strings << "#{key}=#{val}\0"
        end

        strings << "\0" # terminate the env block
        env_str = strings.join

        @env_ptr = FFI::MemoryPointer.new(:long, env_str.bytesize)
        @env_ptr.put_bytes 0, env_str, 0, env_str.bytesize
      end

      def create_cwd_pointer
        @cwd_ptr = FFI::MemoryPointer.from_string(@cwd || Dir.pwd)
      end

      def create_process
        ok = Lib.create_process(
          nil,          # application name
          @cmd_ptr,     # command line
          nil,          # process attributes
          nil,          # thread attributes
          true,         # inherit handles
          @flags,       # creation flags
          @env_ptr,     # environment
          @cwd_ptr,     # current directory
          startup_info, # startup info
          process_info  # process info
        )

        ok or raise LaunchError, Lib.last_error_message

        process_info[:dwProcessId]
      end

      def startup_info
        @startup_info ||= StartupInfo.new
      end

      def process_info
        @process_info ||= ProcessInfo.new
      end

      def setup_flags
        @flags |= DETACHED_PROCESS if @detach
        @flags |= CREATE_BREAKAWAY_FROM_JOB if @leader
      end

      def setup_io
        startup_info[:dwFlags] ||= 0
        startup_info[:dwFlags] |= STARTF_USESTDHANDLES

        if @stdout
          startup_info[:hStdOutput] = std_stream_handle_for(@stdout)
        end

        if @stderr
          startup_info[:hStdError] = std_stream_handle_for(@stderr)
        end

        if @duplex
          read_pipe_ptr  = FFI::MemoryPointer.new(:pointer)
          write_pipe_ptr = FFI::MemoryPointer.new(:pointer)
          sa             = SecurityAttributes.new(:inherit => true)

          ok = Lib.create_pipe(read_pipe_ptr, write_pipe_ptr, sa, 0)
          Lib.check_error ok

          @read_pipe  = read_pipe_ptr.read_pointer
          @write_pipe = write_pipe_ptr.read_pointer

          Lib.set_handle_inheritance @read_pipe, true
          Lib.set_handle_inheritance @write_pipe, false

          startup_info[:hStdInput] = @read_pipe
        else
          startup_info[:hStdInput] = std_stream_handle_for(STDIN)
        end
      end

      def std_stream_handle_for(io)
        handle = Lib.handle_for(io)

        begin
          Lib.set_handle_inheritance handle, true
        rescue ChildProcess::Error
          # If the IO was set to close on exec previously, this call will fail.
          # That's probably OK, since the user explicitly asked for it to be
          # closed (at least I have yet to find other cases where this will
          # happen...)
        end

        handle
      end

      def close_handles
        Lib.close_handle process_info[:hProcess]
        Lib.close_handle process_info[:hThread]

        if @duplex
          @stdin = Lib.io_for(Lib.duplicate_handle(@write_pipe), File::WRONLY)
          Lib.close_handle @read_pipe
          Lib.close_handle @write_pipe
        end
      end

      def quote_if_necessary(str)
        quote = str.start_with?('"') ? "'" : '"'

        case str
        when /[\s\\'"]/
          [quote, str, quote].join
        else
          str
        end
      end
    end # ProcessBuilder
  end # Windows
end # ChildProcess
