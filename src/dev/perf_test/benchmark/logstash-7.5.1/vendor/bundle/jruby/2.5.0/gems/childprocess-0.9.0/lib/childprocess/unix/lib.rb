module ChildProcess
  module Unix
    module Lib
      extend FFI::Library
      ffi_lib FFI::Library::LIBC

      if ChildProcess.os == :macosx
        attach_function :_NSGetEnviron, [], :pointer
        def self.environ
          _NSGetEnviron().read_pointer
        end
      elsif respond_to? :attach_variable
        attach_variable :environ, :pointer
      end

      attach_function :strerror, [:int], :string
      attach_function :chdir, [:string], :int
      attach_function :fcntl, [:int, :int, :int], :int # fcntl actually takes varags, but we only need this version.

      # int posix_spawnp(
      #   pid_t *restrict pid,
      #   const char *restrict file,
      #   const posix_spawn_file_actions_t *file_actions,
      #   const posix_spawnattr_t *restrict attrp,
      #   char *const argv[restrict],
      #   char *const envp[restrict]
      # );

      attach_function :posix_spawnp, [
        :pointer,
        :string,
        :pointer,
        :pointer,
        :pointer,
        :pointer
      ], :int

      # int posix_spawn_file_actions_init(posix_spawn_file_actions_t *file_actions);
      attach_function :posix_spawn_file_actions_init, [:pointer], :int

      # int posix_spawn_file_actions_destroy(posix_spawn_file_actions_t *file_actions);
      attach_function :posix_spawn_file_actions_destroy, [:pointer], :int

      # int posix_spawn_file_actions_addclose(posix_spawn_file_actions_t *file_actions, int filedes);
      attach_function :posix_spawn_file_actions_addclose, [:pointer, :int], :int

      # int posix_spawn_file_actions_addopen(
      #   posix_spawn_file_actions_t *restrict file_actions,
      #   int filedes,
      #   const char *restrict path,
      #   int oflag,
      #   mode_t mode
      # );
      attach_function :posix_spawn_file_actions_addopen, [:pointer, :int, :string, :int, :mode_t], :int

      # int posix_spawn_file_actions_adddup2(
      #   posix_spawn_file_actions_t *file_actions,
      #   int filedes,
      #   int newfiledes
      # );
      attach_function :posix_spawn_file_actions_adddup2, [:pointer, :int, :int], :int

      # int posix_spawnattr_init(posix_spawnattr_t *attr);
      attach_function :posix_spawnattr_init, [:pointer], :int

      # int posix_spawnattr_destroy(posix_spawnattr_t *attr);
      attach_function :posix_spawnattr_destroy, [:pointer], :int

      # int posix_spawnattr_setflags(posix_spawnattr_t *attr, short flags);
      attach_function :posix_spawnattr_setflags, [:pointer, :short], :int

      # int posix_spawnattr_getflags(const posix_spawnattr_t *restrict attr, short *restrict flags);
      attach_function :posix_spawnattr_getflags, [:pointer, :pointer], :int

      # int posix_spawnattr_setpgroup(posix_spawnattr_t *attr, pid_t pgroup);
      attach_function :posix_spawnattr_setpgroup, [:pointer, :pid_t], :int

      # int posix_spawnattr_getpgroup(const posix_spawnattr_t *restrict attr, pid_t *restrict pgroup);
      attach_function :posix_spawnattr_getpgroup, [:pointer, :pointer], :int

      # int posix_spawnattr_setsigdefault(posix_spawnattr_t *restrict attr, const sigset_t *restrict sigdefault);
      attach_function :posix_spawnattr_setsigdefault, [:pointer, :pointer], :int

      # int posix_spawnattr_getsigdefault(const posix_spawnattr_t *restrict attr, sigset_t *restrict sigdefault);
      attach_function :posix_spawnattr_getsigdefault, [:pointer, :pointer], :int

      # int posix_spawnattr_setsigmask(posix_spawnattr_t *restrict attr, const sigset_t *restrict sigmask);
      attach_function :posix_spawnattr_setsigmask, [:pointer, :pointer], :int

      # int posix_spawnattr_getsigmask(const posix_spawnattr_t *restrict attr, sigset_t *restrict sigmask);
      attach_function :posix_spawnattr_getsigmask, [:pointer, :pointer], :int

      def self.check(errno)
        if errno != 0
          raise Error, Lib.strerror(FFI.errno)
        end
      end

      class FileActions
        def initialize
          @ptr = FFI::MemoryPointer.new(1, Platform::SIZEOF.fetch(:posix_spawn_file_actions_t), false)
          Lib.check Lib.posix_spawn_file_actions_init(@ptr)
        end

        def add_close(fileno)
          Lib.check Lib.posix_spawn_file_actions_addclose(
            @ptr,
            fileno
          )
        end

        def add_open(fileno, path, oflag, mode)
          Lib.check Lib.posix_spawn_file_actions_addopen(
            @ptr,
            fileno,
            path,
            oflag,
            mode
          )
        end

        def add_dup(fileno, new_fileno)
          Lib.check Lib.posix_spawn_file_actions_adddup2(
            @ptr,
            fileno,
            new_fileno
          )
        end

        def free
          Lib.check Lib.posix_spawn_file_actions_destroy(@ptr)
          @ptr = nil
        end

        def to_ptr
          @ptr
        end
      end # FileActions

      class Attrs
        def initialize
          @ptr = FFI::MemoryPointer.new(1, Platform::SIZEOF.fetch(:posix_spawnattr_t), false)
          Lib.check Lib.posix_spawnattr_init(@ptr)
        end

        def free
          Lib.check Lib.posix_spawnattr_destroy(@ptr)
          @ptr = nil
        end

        def flags=(flags)
          Lib.check Lib.posix_spawnattr_setflags(@ptr, flags)
        end

        def flags
          ptr = FFI::MemoryPointer.new(:short)
          Lib.check Lib.posix_spawnattr_getflags(@ptr, ptr)

          ptr.read_short
        end

        def pgroup=(pid)
          self.flags |= Platform::POSIX_SPAWN_SETPGROUP
          Lib.check Lib.posix_spawnattr_setpgroup(@ptr, pid)
        end

        def to_ptr
          @ptr
        end
      end # Attrs

    end
  end
end

# missing on rubinius
class FFI::MemoryPointer
  unless method_defined?(:from_string)
    def self.from_string(str)
      ptr = new(1, str.bytesize + 1)
      ptr.write_string("#{str}\0")

      ptr
    end
  end
end
