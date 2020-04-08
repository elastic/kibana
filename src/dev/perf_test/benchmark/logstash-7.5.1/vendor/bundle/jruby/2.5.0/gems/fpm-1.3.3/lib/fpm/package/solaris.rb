require "erb"
require "fpm/namespace"
require "fpm/package"
require "fpm/errors"
require "fpm/util"

# TODO(sissel): Add dependency checking support.
# IIRC this has to be done as a 'checkinstall' step.
class FPM::Package::Solaris < FPM::Package

  option "--user", "USER",
    "Set the user to USER in the prototype files.",
    :default => 'root'

  option "--group", "GROUP",
    "Set the group to GROUP in the prototype file.",
    :default => 'root'

  def architecture
    case @architecture
    when nil, "native"
      @architecture = %x{uname -p}.chomp
    end
    # "all" is a valid arch according to
    # http://www.bolthole.com/solaris/makeapackage.html

    return @architecture
  end # def architecture

  def specfile(builddir)
    "#{builddir}/pkginfo"
  end

  def output(output_path)
    self.scripts.each do |name, path|
      case name
        when "pre-install"
          safesystem("cp", path, "./preinstall")
          File.chmod(0755, "./preinstall")
        when "post-install"
          safesystem("cp", path, "./postinstall")
          File.chmod(0755, "./postinstall")
        when "pre-uninstall"
          raise FPM::InvalidPackageConfiguration.new(
            "pre-uninstall is not supported by Solaris packages"
          )
        when "post-uninstall"
          raise FPM::InvalidPackageConfiguration.new(
            "post-uninstall is not supported by Solaris packages"
          )
      end # case name
    end # self.scripts.each

    template = template("solaris.erb")
    File.open("#{build_path}/pkginfo", "w") do |pkginfo|
      pkginfo.puts template.result(binding)
    end

    # Generate the package 'Prototype' file
    File.open("#{build_path}/Prototype", "w") do |prototype|
      prototype.puts("i pkginfo")
      prototype.puts("i preinstall") if self.scripts["pre-install"]
      prototype.puts("i postinstall") if self.scripts["post-install"]

      # TODO(sissel): preinstall/postinstall
      # strip @prefix, since BASEDIR will set prefix via the pkginfo file
      IO.popen("pkgproto #{staging_path}/#{@prefix}=").each_line do |line|
        type, klass, path, mode, user, group = line.split

        prototype.puts([type, klass, path, mode, attributes[:solaris_user], attributes[:solaris_group]].join(" "))
      end # popen "pkgproto ..."
    end # File prototype

    ::Dir.chdir staging_path do
      # Should create a package directory named by the package name.
      safesystem("pkgmk", "-o", "-f", "#{build_path}/Prototype", "-d", build_path)
    end
    

    # Convert the 'package directory' built above to a real solaris package.
    safesystem("pkgtrans", "-s", build_path, output_path, name)
    safesystem("cp", "#{build_path}/#{output_path}", output_path)
  end # def output

  def default_output
    v = version
    v = "#{epoch}:#{v}" if epoch
    if iteration
      "#{name}_#{v}-#{iteration}_#{architecture}.#{type}"
    else
      "#{name}_#{v}_#{architecture}.#{type}"
    end
  end # def default_output
end # class FPM::Deb

