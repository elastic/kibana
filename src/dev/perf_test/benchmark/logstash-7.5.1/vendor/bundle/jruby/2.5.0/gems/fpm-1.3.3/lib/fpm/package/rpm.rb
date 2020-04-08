require "fpm/package"
require "backports"
require "fileutils"
require "find"
require "arr-pm/file" # gem 'arr-pm'

# RPM Package type.
#
# Build RPMs without having to waste hours reading Maximum-RPM.
# Well, in case you want to read it, here: http://www.rpm.org/max-rpm/
#
# The following attributes are supported:
#
# * :rpm_rpmbuild_define - an array of definitions to give to rpmbuild.
#   These are used, verbatim, each as: --define ITEM
class FPM::Package::RPM < FPM::Package
  DIGEST_ALGORITHM_MAP = {
    "md5" => 1,
    "sha1" => 2,
    "sha256" => 8,
    "sha384" => 9,
    "sha512" => 10
  } unless defined?(DIGEST_ALGORITHM_MAP)

  COMPRESSION_MAP = {
    "none" => "w0.gzdio",
    "xz" => "w9.xzdio",
    "gzip" => "w9.gzdio",
    "bzip2" => "w9.bzdio"
  } unless defined?(COMPRESSION_MAP)

  option "--use-file-permissions", :flag, 
      "Use existing file permissions when defining ownership and modes."

  option "--user", "USER", "Set the user to USER in the %files section. Overrides the user when used with use-file-permissions setting."

  option "--group", "GROUP", "Set the group to GROUP in the %files section. Overrides the group when used with use-file-permissions setting."

  option "--defattrfile", "ATTR",
    "Set the default file mode (%defattr).",
    :default => '-' do |value|
      value
  end

  option "--defattrdir", "ATTR",
    "Set the default dir mode (%defattr).",
    :default => '-' do |value|
      value
  end

  rpmbuild_define = []
  option "--rpmbuild-define", "DEFINITION",
    "Pass a --define argument to rpmbuild." do |define|
    rpmbuild_define << define
    next rpmbuild_define
  end

  option "--digest", DIGEST_ALGORITHM_MAP.keys.join("|"),
    "Select a digest algorithm. md5 works on the most platforms.",
    :default => "md5" do |value|
    if !DIGEST_ALGORITHM_MAP.include?(value.downcase)
      raise "Unknown digest algorithm '#{value}'. Valid options " \
        "include: #{DIGEST_ALGORITHM_MAP.keys.join(", ")}"
    end
    value.downcase
  end

  option "--compression", COMPRESSION_MAP.keys.join("|"),
    "Select a compression method. gzip works on the most platforms.",
    :default => "gzip" do |value|
    if !COMPRESSION_MAP.include?(value.downcase)
      raise "Unknown compression type '#{value}'. Valid options " \
        "include: #{COMPRESSION_MAP.keys.join(", ")}"
    end
    value.downcase
  end

  # TODO(sissel): Try to be smart about the default OS.
  # issue #309
  option "--os", "OS", "The operating system to target this rpm for. " \
    "You want to set this to 'linux' if you are using fpm on OS X, for example"

  option "--changelog", "FILEPATH", "Add changelog from FILEPATH contents" do |file|
    File.read(File.expand_path(file))
  end

  option "--sign", :flag, "Pass --sign to rpmbuild"

  option "--auto-add-directories", :flag, "Auto add directories not part of filesystem"
  option "--auto-add-exclude-directories", "DIRECTORIES",
    "Additional directories ignored by '--rpm-auto-add-directories' flag",
    :multivalued => true, :attribute_name => :auto_add_exclude_directories

  option "--autoreqprov", :flag, "Enable RPM's AutoReqProv option"
  option "--autoreq", :flag, "Enable RPM's AutoReq option"
  option "--autoprov", :flag, "Enable RPM's AutoProv option"

  option "--attr", "ATTRFILE",
    "Set the attribute for a file (%attr).",
    :multivalued => true, :attribute_name => :attrs
  
  option "--init", "FILEPATH", "Add FILEPATH as an init script",
	:multivalued => true do |file|
    next File.expand_path(file)
  end

  rpmbuild_filter_from_provides = []
  option "--filter-from-provides", "REGEX",
    "Set %filter_from_provides to the supplied REGEX." do |filter_from_provides|
    rpmbuild_filter_from_provides << filter_from_provides
    next rpmbuild_filter_from_provides
  end
  rpmbuild_filter_from_requires = []
  option "--filter-from-requires", "REGEX",
    "Set %filter_from_requires to the supplied REGEX." do |filter_from_requires|
    rpmbuild_filter_from_requires << filter_from_requires
    next rpmbuild_filter_from_requires
  end

  option "--ignore-iteration-in-dependencies", :flag,
            "For '=' (equal) dependencies, allow iterations on the specified " \
            "version. Default is to be specific. This option allows the same " \
            "version of a package but any iteration is permitted"

  option "--verbatim-gem-dependencies", :flag,
           "When converting from a gem, leave the old (fpm 0.4.x) style " \
           "dependency names. This flag will use the old 'rubygem-foo' " \
           "names in rpm requires instead of the redhat style " \
           "rubygem(foo).", :default => false

  option "--verifyscript", "FILE",
    "a script to be run on verification" do |val|
    File.expand_path(val) # Get the full path to the script
  end # --verifyscript
  option "--pretrans", "FILE",
    "pretrans script" do |val|
    File.expand_path(val) # Get the full path to the script
  end # --pretrans
  option "--posttrans", "FILE",
    "posttrans script" do |val|
    File.expand_path(val) # Get the full path to the script
  end # --posttrans

  ["before-install","after-install","before-uninstall","after-target-uninstall"].each do |trigger_type|
     rpm_trigger = []
     option "--trigger-#{trigger_type}", "'[OPT]PACKAGE: FILEPATH'", "Adds a rpm trigger script located in FILEPATH, " \
            "having 'OPT' options and linking to 'PACKAGE'. PACKAGE can be a comma seperated list of packages. " \
            "See: http://rpm.org/api/4.4.2.2/triggers.html" do |trigger|
       match = trigger.match(/^(\[.*\]|)(.*): (.*)$/)
       @logger.fatal("Trigger '#{trigger_type}' definition can't be parsed ('#{trigger}')") unless match
       opt, pkg, file = match.captures
       @logger.fatal("File given for --trigger-#{trigger_type} does not exist (#{file})") unless File.exists?(file)
       rpm_trigger << [pkg, File.read(file), opt.tr('[]','')]
       next rpm_trigger
     end
   end
 
  private
    
  # Fix path name
  # Replace [ with [\[] to make rpm not use globs
  # Replace * with [*] to make rpm not use globs
  # Replace ? with [?] to make rpm not use globs
  # Replace % with [%] to make rpm not expand macros
  def rpm_fix_name(name)
    name = "\"#{name}\"" if name[/\s/]
    name = name.gsub("[", "[\\[]")
    name = name.gsub("*", "[*]")
    name = name.gsub("?", "[?]")
    name = name.gsub("%", "[%]")
  end

  def rpm_file_entry(file)
    original_file = file
    file = rpm_fix_name(file)

    if !attributes[:rpm_use_file_permissions?]

      if attrs[file].nil?
        return file
      else
        return sprintf("%%attr(%s) %s\n", attrs[file], file)
      end
    end

    return sprintf("%%attr(%s) %s\n", attrs[file], file) unless attrs[file].nil?

    # Stat the original filename in the relative staging path
    ::Dir.chdir(staging_path) do
      stat = File.lstat(original_file.gsub(/\"/, '').sub(/^\//,''))

      # rpm_user and rpm_group attribute should override file ownership
      # otherwise use the current file user/group by name.
      user = attributes[:rpm_user] || Etc.getpwuid(stat.uid).name
      group = attributes[:rpm_group] || Etc.getgrgid(stat.gid).name
      mode = stat.mode
      return sprintf("%%attr(%o, %s, %s) %s\n", mode & 4095 , user, group, file)
    end
  end


  # Handle any architecture naming conversions.
  # For example, debian calls amd64 what redhat calls x86_64, this
  # method fixes those types of things.
  def architecture
    case @architecture
      when nil
        return %x{uname -m}.chomp   # default to current arch
      when "amd64" # debian and redhat disagree on architecture names
        return "x86_64"
      when "native"
        return %x{uname -m}.chomp   # 'native' is current arch
      when "all"
        # Translate fpm "all" arch to what it means in RPM.
        return "noarch"
      else
        return @architecture
    end
  end # def architecture

  # This method ensures a default value for iteration if none is provided.
  def iteration
    return @iteration ? @iteration : 1
  end # def iteration

  # See FPM::Package#converted_from
  def converted_from(origin)
    if origin == FPM::Package::Gem
      fixed_deps = []
      self.dependencies.collect do |dep|
        # Gem dependency operator "~>" is not compatible with rpm. Translate any found.
        fixed_deps = fixed_deps + expand_pessimistic_constraints(dep)
      end
      self.dependencies = fixed_deps

      # Convert 'rubygem-foo' provides values to 'rubygem(foo)'
      # since that's what most rpm packagers seem to do.
      self.provides = self.provides.collect do |provides|
        # Tries to match rubygem_prefix [1], gem_name [2] and version [3] if present
        # and return it in rubygem_prefix(gem_name) form
        if name=/^(#{attributes[:gem_package_name_prefix]})-([^\s]+)\s*(.*)$/.match(provides)
          "#{name[1]}(#{name[2]})#{name[3] ? " #{name[3]}" : ""}"
        else
          provides
        end
      end
      if !self.attributes[:rpm_verbatim_gem_dependencies?]
        self.dependencies = self.dependencies.collect do |dependency|
          # Tries to match rubygem_prefix [1], gem_name [2] and version [3] if present
          # and return it in rubygem_prefix(gem_name) form
          if name=/^(#{attributes[:gem_package_name_prefix]})-([^\s]+)\s*(.*)$/.match(dependency)
            "#{name[1]}(#{name[2]})#{name[3] ? " #{name[3]}" : ""}"
          else
            dependency
          end
        end
      end
    end

    # Convert != dependency as Conflict =, as rpm doesn't understand !=
    self.dependencies = self.dependencies.select do |dep|
      name, op, version = dep.split(/\s+/)
      dep_ok = true
      if op == '!='
        self.conflicts << "#{name} = #{version}"
        dep_ok = false
      end
      dep_ok
    end

    # if --ignore-iteration-in-dependencies is true convert foo = X, to
    # foo >= X , foo < X+1
    if self.attributes[:rpm_ignore_iteration_in_dependencies?]
      self.dependencies = self.dependencies.collect do |dep|
        name, op, version = dep.split(/\s+/)
        if op == '='
          nextversion = version.split('.').collect { |v| v.to_i }
          nextversion[-1] += 1
          nextversion = nextversion.join(".")
          logger.warn("Converting dependency #{dep} to #{name} >= #{version}, #{name} < #{nextversion}")
          ["#{name} >= #{version}", "#{name} < #{nextversion}"]
        else
          dep
        end
      end.flatten
    end

  setscript = proc do |scriptname|
      script_path = self.attributes[scriptname]
      # Skip scripts not set
      next if script_path.nil?
      if !File.exists?(script_path)
        logger.error("No such file (for #{scriptname.to_s}): #{script_path.inspect}")
        script_errors	 << script_path
      end
      # Load the script into memory.
      scripts[scriptname] = File.read(script_path)
    end

  setscript.call(:rpm_verifyscript)
  setscript.call(:rpm_posttrans)
  setscript.call(:rpm_pretrans)
  end # def converted

  def rpm_get_trigger_type(flag)
    puts "#{flag.to_s(2)}"
    if (flag & (1 << 25)) == (1 << 25)
       :rpm_trigger_before_install
    elsif (flag & (1 << 16)) == (1 << 16)
       :rpm_trigger_after_install
    elsif (flag & (1 << 17)) == (1 << 17)
       :rpm_trigger_before_uninstall
    elsif (flag & (1 << 18)) == (1 << 18)
       :rpm_trigger_after_target_uninstall
    else
       @logger.fatal("I don't know about this triggerflag ('#{flag}')")
    end
  end # def rpm_get_trigger

  def input(path)
    rpm = ::RPM::File.new(path)

    tags = {}
    rpm.header.tags.each do |tag|
      tags[tag.tag] = tag.value
    end

    self.architecture = tags[:arch]
    self.category = tags[:group]
    self.description = tags[:description]
    self.epoch = (tags[:epoch] || [nil]).first # for some reason epoch is an array
    self.iteration = tags[:release]
    self.license = tags[:license]
    self.maintainer = maintainer
    self.name = tags[:name]
    self.url = tags[:url]
    self.vendor = tags[:vendor]
    self.version = tags[:version]

    self.scripts[:before_install] = tags[:prein]
    self.scripts[:after_install] = tags[:postin]
    self.scripts[:before_remove] = tags[:preun]
    self.scripts[:after_remove] = tags[:postun]
    self.scripts[:rpm_verifyscript] = tags[:verifyscript]
    self.scripts[:rpm_posttrans] = tags[:posttrans]
    self.scripts[:rpm_pretrans] = tags[:pretrans]
    # TODO(sissel): prefix these scripts above with a shebang line if there isn't one?
    # Also taking into account the value of tags[preinprog] etc, something like:
    #    #!#{tags[:preinprog]}
    #    #{tags[prein]}

    if !tags[:triggerindex].nil?
      val = tags[:triggerindex].zip(tags[:triggername],tags[:triggerflags],tags[:triggerversion]).group_by{ |x| x[0]}
      val = val.collect do |order,data|
        new_data = data.collect { |x| [ x[1], rpm.operator(x[2]), x[3]].join(" ").strip}.join(", ")
        [order, rpm_get_trigger_type(data[0][2]), new_data]
      end
      val.each do |order, attr,data|
        self.attributes[attr] = [] if self.attributes[attr].nil?
        scriptprog = (tags[:triggerscriptprog][order] == '/bin/sh') ? "" : "-p #{tags[:triggerscriptprog][order]}"
        self.attributes[attr] << [data,tags[:triggerscripts][order],scriptprog]
      end
    end

    if !attributes[:no_auto_depends?]
      self.dependencies += rpm.requires.collect do |name, operator, version|
        [name, operator, version].join(" ")
      end
    end

    self.conflicts += rpm.conflicts.collect do |name, operator, version|
      [name, operator, version].join(" ")
    end
    self.provides += rpm.provides.collect do |name, operator, version|
      [name, operator, version].join(" ")
    end
    #input.replaces += replaces
    
    self.config_files += rpm.config_files

    # rpms support '%dir' things for specifying empty directories to package,
    # but the rpm header itself doesn't actually record this information.
    # so there's no 'directories' to copy, so don't try to merge in the
    # 'directories' feature. 
    # TODO(sissel): If you want this feature, we'll have to find scan
    # the extracted rpm for empty directories. I'll wait until someone asks for
    # this feature
    #self.directories += rpm.directories

    # Extract to the staging directory
    rpm.extract(staging_path)
  end # def input

  def prefixed_path(path)
    Pathname.new(path).absolute?() ? path : File.join(self.prefix, path)
  end # def prefixed_path

  def output(output_path)
    output_check(output_path)
    %w(BUILD RPMS SRPMS SOURCES SPECS).each { |d| FileUtils.mkdir_p(build_path(d)) }
    args = ["rpmbuild", "-bb"]

    if %x{uname -m}.chomp != self.architecture
      rpm_target = self.architecture
    end

    # issue #309
    if !attributes[:rpm_os].nil?
      rpm_target = "#{architecture}-unknown-#{attributes[:rpm_os]}"
    end

    # issue #707
    if !rpm_target.nil?
      args += ["--target", rpm_target]
    end

    args += [
      "--define", "buildroot #{build_path}/BUILD",
      "--define", "_topdir #{build_path}",
      "--define", "_sourcedir #{build_path}",
      "--define", "_rpmdir #{build_path}/RPMS",
      "--define", "_tmppath #{attributes[:workdir]}"
    ]

    args += ["--sign"] if attributes[:rpm_sign?]

    if attributes[:rpm_auto_add_directories?]
      fs_dirs_list = File.join(template_dir, "rpm", "filesystem_list")
      fs_dirs = File.readlines(fs_dirs_list).reject { |x| x =~ /^\s*#/}.map { |x| x.chomp }
      fs_dirs.concat((attributes[:auto_add_exclude_directories] or []))

      Find.find(staging_path) do |path|
        next if path == staging_path
        if File.directory? path and !File.symlink? path
          add_path = path.gsub(/^#{staging_path}/,'')
          self.directories << add_path if not fs_dirs.include? add_path
        end
      end
    else
      self.directories = self.directories.map { |x| self.prefixed_path(x) }
      alldirs = []
      self.directories.each do |path|
        Find.find(File.join(staging_path, path)) do |subpath|
          if File.directory? subpath and !File.symlink? subpath
            alldirs << subpath.gsub(/^#{staging_path}/, '')
          end
        end
      end
      self.directories = alldirs
    end

    # scan all conf file paths for files and add them
    allconfigs = []
    self.config_files.each do |path|
      cfg_path = File.join(staging_path, path)
      raise "Config file path #{cfg_path} does not exist" unless File.exist?(cfg_path)
      Find.find(cfg_path) do |p|
        allconfigs << p.gsub("#{staging_path}/", '') if File.file? p
      end
    end
    allconfigs.sort!.uniq!

    self.config_files = allconfigs.map { |x| File.join("/", x) }

    # add init script if present
    (attributes[:rpm_init_list] or []).each do |init|
      name = File.basename(init, ".init")
      dest_init = File.join(staging_path, "etc/init.d/#{name}")
      FileUtils.mkdir_p(File.dirname(dest_init))
      FileUtils.cp init, dest_init
      File.chmod(0755, dest_init)
    end

    (attributes[:rpm_rpmbuild_define] or []).each do |define|
      args += ["--define", define]
    end

    # copy all files from staging to BUILD dir
    Find.find(staging_path) do |path|
      src = path.gsub(/^#{staging_path}/, '')
      dst = File.join(build_path, build_sub_dir, src)
      copy_entry(path, dst)
    end

    rpmspec = template("rpm.erb").result(binding)
    specfile = File.join(build_path("SPECS"), "#{name}.spec")
    File.write(specfile, rpmspec)

    edit_file(specfile) if attributes[:edit?]

    args << specfile

    logger.info("Running rpmbuild", :args => args)
    safesystem(*args)

    ::Dir["#{build_path}/RPMS/**/*.rpm"].each do |rpmpath|
      # This should only output one rpm, should we verify this?
      FileUtils.cp(rpmpath, output_path)
    end
  end # def output

  def prefix
    return (attributes[:prefix] or "/")
  end # def prefix

  def build_sub_dir
    return "BUILD"
    #return File.join("BUILD", prefix)
  end # def build_sub_dir

  def version
    if @version.kind_of?(String) and @version.include?("-")
      logger.warn("Package version '#{@version}' includes dashes, converting" \
                   " to underscores")
      @version = @version.gsub(/-/, "_")
    end

    return @version
  end

  # The default epoch value must be nil, see #381
  def epoch
    return @epoch if @epoch.is_a?(Numeric)

    if @epoch.nil? or @epoch.empty?
      logger.warn("no value for epoch is set, defaulting to nil")
      return nil
    end

    return @epoch
  end # def epoch

  def to_s(format=nil)
    return super("NAME-VERSION-ITERATION.ARCH.TYPE") if format.nil?
    return super(format)
  end # def to_s

  def payload_compression
    return COMPRESSION_MAP[attributes[:rpm_compression]]
  end # def payload_compression

  def digest_algorithm
    return DIGEST_ALGORITHM_MAP[attributes[:rpm_digest]]
  end # def digest_algorithm

  public(:input, :output, :converted_from, :architecture, :to_s, :iteration,
         :payload_compression, :digest_algorithm, :prefix, :build_sub_dir,
         :epoch, :version, :prefixed_path)
end # class FPM::Package::RPM
