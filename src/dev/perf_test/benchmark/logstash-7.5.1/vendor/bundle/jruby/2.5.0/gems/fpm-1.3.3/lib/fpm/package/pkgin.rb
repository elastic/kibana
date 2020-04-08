class FPM::Package::Pkgin < FPM::Package

  def output(output_path)
    output_check(output_path)

    File.write(build_path("build-info"), `pkg_info -X pkg_install | egrep '^(MACHINE_ARCH|OPSYS|OS_VERSION|PKGTOOLS_VERSION)'`)

    cwd = ::Dir.pwd
    ::Dir.chdir(staging_path)

    files = []
    Find.find(".") do |path|
      stat = File.lstat(path)
      next unless stat.symlink? or stat.file?
      files << path
    end
    ::Dir.chdir(cwd)

    File.write(build_path("packlist"), files.sort.join("\n"))

    File.write(build_path("comment"),  self.description + "\n")

    File.write(build_path("description"), self.description + "\n")

    args = [ "-B", build_path("build-info"), "-c", build_path("comment"), "-d", build_path("description"), "-f", build_path("packlist"), "-I", "/opt/local", "-p", staging_path,  "-U", "#{cwd}/#{name}-#{self.version}-#{iteration}.tgz" ]
    safesystem("pkg_create", *args)

  end

  def iteration
    return @iteration ? @iteration : 1
  end

end

