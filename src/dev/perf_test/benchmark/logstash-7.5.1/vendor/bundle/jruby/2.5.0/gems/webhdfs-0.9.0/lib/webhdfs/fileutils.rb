require_relative 'client'

module WebHDFS
  module FileUtils
    # Those values hold NameNode location
    @fu_host = 'localhost'
    @fu_port = 50070
    @fu_user = nil
    @fu_doas = nil
    @fu_httpfs_mode = false
    @fu_ssl = false
    @fu_ssl_ca_file = nil
    @fu_ssl_verify_mode = nil
    @fu_kerberos = false

    # Public: Set hostname and port number of WebHDFS
    #
    # host - hostname
    # port - port
    # user - username
    # doas - proxy user name
    # proxy_address - address of the net http proxy to use
    # proxy_port - port of the net http proxy to use
    #
    # Examples
    #
    #   FileUtils.set_server 'localhost', 50070
    #
    def set_server(host, port, user=nil, doas=nil, proxy_address=nil, proxy_port=nil)
      @fu_host = host
      @fu_port = port
      @fu_user = user
      @fu_doas = doas
      @fu_paddr = proxy_address
      @fu_pport = proxy_port
    end
    module_function :set_server

    # Public: Set httpfs mode enable/disable
    #
    # mode - boolean (default true)
    #
    # Examples
    #
    #   FileUtils.set_httpfs_mode
    #
    def set_httpfs_mode(mode=true)
      @fu_httpfs_mode = mode
    end
    module_function :set_httpfs_mode

    # Public: Set ssl enable/disable
    #
    # mode - boolean (default true)
    #
    # Examples
    #
    #   FileUtils.set_ssl
    #
    def set_ssl(mode=true)
      @fu_ssl = mode
    end
    module_function :set_ssl

    # Public: Set ssl ca_file
    #
    # ca_file - string
    #
    # Examples
    #
    #   FileUtils.set_ca_file("/path/to/ca_file.pem")
    #
    def set_ssl_ca_file(ca_file)
      @fu_ssl_ca_file = ca_file
    end
    module_function :set_ssl_ca_file

    # Public: Set ssl verify mode
    #
    # mode - :none or :peer
    #
    # Examples
    #
    #   FileUtils.set_ssl_verify_mode(:peer)
    #
    def set_ssl_verify_mode(mode)
      @fu_ssl_verify_mode = mode
    end
    module_function :set_ssl_verify_mode

    # Public: Set kerberos authentication enable/disable
    #
    # mode - boolean (default true)
    #
    # Examples
    #
    #   FileUtils.set_kerberos
    #
    def set_kerberos(mode=true)
      @fu_kerberos = mode
    end
    module_function :set_kerberos

    # Public: Copy local file into HDFS
    #
    # file - local file path
    # path - HDFS file path
    # options - :overwrite, :blocksize, :replication, :mode, :buffersize, :verbose
    #
    # Examples
    #
    #   FileUtils.copy_from_local 'local_file', 'remote_file'
    #
    def copy_from_local(file, path, options={})
      opts = options.dup
      fu_log "copy_from_local local=#{file} hdfs=#{path}" if opts.delete(:verbose)
      if mode = opts.delete(:mode)
        mode = ('%03o' % mode) if mode.is_a? Integer
      else
        mode = '644'
      end
      opts[:permission] = mode
      opts[:overwrite] ||= true

      client.create(path, File.new(file, 'rb').read(File.size(file)), opts)
    end
    module_function :copy_from_local

    # Public: Copy local file into HDFS with IOStream
    #
    # file - local file IO handle
    # path - HDFS file path
    # options - :overwrite, :blocksize, :replication, :mode, :buffersize, :verbose
    #
    # Examples
    #
    #   FileUtils.copy_from_local_via_stream 'local_file_IO_handle', 'remote_file'
    #
    def copy_from_local_via_stream(file, path, options={})
      opts = options.dup
      fu_log "copy_from_local_via_stream local=#{file} hdfs=#{path}" if opts.delete(:verbose)
      if mode = opts.delete(:mode)
        mode = ('%03o' % mode) if mode.is_a? Integer
      else
        mode = '644'
      end
      opts[:permission] = mode
      opts[:overwrite] ||= true

      client.create(path, File.new(file, 'rb'), opts)
    end
    module_function :copy_from_local_via_stream

    # Public: Copy remote HDFS file into local
    #
    # path - HDFS file path
    # file - local file path
    # options - :offset, :length, :buffersize, :verbose
    #
    # Examples
    #
    #   FileUtils.copy_to_local 'remote_file', 'local_file'
    #
    def copy_to_local(path, file, options={})
      opts = options.dup
      fu_log "copy_to_local hdfs=#{path} local=#{file}" if opts.delete(:verbose)
      File.open(file, "wb") do |f|
        f.write client.read(path, opts)
      end
    end
    module_function :copy_to_local

    # Public: Append to HDFS file
    #
    # path - HDFS file path
    # body - contents
    # options - :buffersize, :verbose
    #
    # Examples
    #
    #   FileUtils.append 'remote_path', 'contents'
    #
    def append(path, body, options={})
      opts = options.dup
      fu_log "append #{body.bytesize} bytes to #{path}" if opts.delete(:verbose)
      client.append(path, body, opts)
    end
    module_function :append

    # Public: Create one or more directories.
    #
    # list - directory name, or list of them
    # options - :mode, :verbose
    #
    # Examples
    #
    #   FileUtils.mkdir 'test'
    #   FileUtils.mkdir %w( tmp data )
    #   FileUtils.mkdir 'tmp', :mode => 0700
    #
    def mkdir(list, options={})
      opts = options.dup
      list = [list].flatten
      fu_log "mkdir #{options[:mode] ? ('-m %03o ' % options[:mode]) : ''}#{list.join ' '}" if opts.delete(:verbose)
      if mode = opts[:mode]
        mode = ('0%03o' % mode) if mode.is_a? Integer
      else
        mode = '0755'
      end
      c = client
      list.each { |dir|
        c.mkdir(dir, {:permission => mode})
      }
    end
    module_function :mkdir

    # Public: Create one or more directories recursively.
    #
    # list - directory name, or list of them
    # options - :mode, :verbose
    #
    # Examples
    #
    #   FileUtils.mkdir_p 'dir/subdir'
    #   FileUtils.mkdir_p %w( tmp data )
    #   FileUtils.mkdir_p 'dir/subdir', :mode => 0700
    #
    alias mkdir_p mkdir
    module_function :mkdir_p

    # Public: Remove one or more directories or files.
    #
    # list - directory name, or list of them
    # options - :recursive, :verbose
    #
    # Examples
    #
    #   FileUtils.rm 'dir'
    #   FileUtils.rm %w( tmp data )
    #   FileUtils.rm 'dir', :recursive => true
    #
    def rm(list, options={})
      opts = options.dup
      list = [list].flatten
      fu_log "rm #{list.join ' '}" if opts.delete(:verbose)
      c = client
      list.each { |dir|
        c.delete(dir, {:recursive => opts[:recursive] || false})
      }
    end
    module_function :rm

    # Public: Remove one or more directories/files recursively.
    #
    # list - directory name, or list of them
    # options - :verbose
    #
    # Examples
    #
    #   FileUtils.rmr 'dir'
    #   FileUtils.rmr %w( tmp data )
    #   FileUtils.rmr 'dir'
    #
    def rmr(list, options={})
      self.rm(list, options.merge({:recursive => true}))
    end
    module_function :rmr

    # Public: Rename a file or directory.
    #
    # src - from
    # dst - to
    # options - :verbose
    #
    # Examples
    #
    #   FileUtils.rename 'from', 'to'
    #
    def rename(src, dst, options={})
      opts = options.dup
      fu_log "rename #{src} #{dst}" if opts.delete(:verbose)
      client.rename(src, dst, opts)
    end
    module_function :rename

    # Public: Change permission of one or more directories/files.
    #
    # mode - permission
    # list - file/directory name or list of them.
    # options - :verbose
    #
    # Examples
    #
    #   FileUtils.chmod 0755, 'dir'
    #   FileUtils.chmod 0644, 'file'
    #
    def chmod(mode, list, options={})
      opts = options.dup
      list = [list].flatten
      fu_log sprintf('chmod %o %s', mode, list.join(' ')) if opts.delete(:verbose)
      mode = ('%03o' % mode) if mode.is_a? Integer
      c = client
      list.each { |entry|
        c.chmod(entry, mode, opts)
      }
    end
    module_function :chmod

    # Public: Change an ownership of one or more directories/files.
    #
    # user - username
    # group - groupname
    # list - file/directory name or list of them
    # options - :verbose
    #
    # Examples
    #
    #   FileUtils.chmod 0755, 'dir'
    #   FileUtils.chmod 0644, 'file'
    #
    def chown(user, group, list, options={})
      opts = options.dup
      list = [list].flatten
      fu_log sprintf('chown %s%s',
                     [user,group].compact.join(':') + ' ',
                     list.join(' ')) if opts.delete(:verbose)
      c = client
      list.each { |entry|
        c.chown(entry, {:owner => user, :group => group})
      }
    end
    module_function :chown

    # Public: Set a replication factor of files
    #
    # list - file/directory name or list of them
    # num - replication factor
    # options - :verbose
    #
    # Examples
    #
    #   FileUtils.set_repl_factor 'file', 3
    #
    def set_repl_factor(list, num, options={})
      opts = options.dup
      list = [list].flatten
      fu_log sprintf('set_repl_factor %s %d',
                     list.join(' '), num) if opts.delete(:verbose)
      c = client
      list.each { |entry|
        c.replication(entry, num, opts)
      }
    end
    module_function :set_repl_factor

    # Public: Set an access time of files
    #
    # list - file/directory name or list of them
    # time - new access time
    # options - :verbose
    #
    # Examples
    #
    #   FileUtils.set_atime 'file', Time.now
    #
    def set_atime(list, time, options={})
      opts = options.dup
      list = [list].flatten
      time = time.to_i
      fu_log sprintf('set_atime %s %d', list.join(' '), time) if opts.delete(:verbose)
      c = client
      list.each { |entry|
        c.touch(entry, {:accesstime => time})
      }
    end
    module_function :set_atime

    # Public: Set a modification time of files
    #
    # list - file/directory name or list of them
    # time - new modification time
    # options - :verbose
    #
    # Examples
    #
    #   FileUtils.set_mtime 'file', Time.now
    #
    def set_mtime(list, time, options={})
      opts = options.dup
      list = [list].flatten
      time = time.to_i
      fu_log sprintf('set_mtime %s %d', list.join(' '), time) if opts.delete(:verbose)
      c = client
      list.each { |entry|
        c.touch(entry, {:modificationtime => time})
      }
    end
    module_function :set_mtime

    # Internal: make functin private
    def self.private_module_function(name)
      module_function name
      private_class_method name
    end

    @fileutils_output = $stderr
    @fileutils_label  = '[webhdfs]: '
    # Internal: Logging
    def fu_log(msg)
      @fileutils_output ||= $stderr
      @fileutils_label  ||= ''
      @fileutils_output.puts @fileutils_label + msg
    end
    private_module_function :fu_log

    # Internal
    def client
      client = WebHDFS::Client.new(@fu_host, @fu_port, @fu_user, @fu_doas, @fu_paddr, @fu_pport)
      if @fu_httpfs_mode
        client.httpfs_mode = true
      end
      client.ssl = true if @fu_ssl
      client.ssl_ca_file = @fu_ssl_ca_file if @fu_ssl_ca_file
      client.ssl_verify_mode = @fu_ssl_verify_mode if @fu_ssl_verify_mode
      client.kerberos = true if @fu_kerberos
      client
    end
    private_module_function :client
  end
end
