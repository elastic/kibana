# encoding: utf-8
Thread.abort_on_exception = true
Encoding.default_external = Encoding::UTF_8
$DEBUGLIST = (ENV["DEBUG"] || "").split(",")

require "clamp"
require "rubygems"
require "jars/gemspec_artifacts"
require 'fileutils'
require 'securerandom'

class LogStash::DependencyReport < Clamp::Command
  option [ "--csv" ], "OUTPUT_PATH", "The path to write the dependency report in csv format.",
    :required => true, :attribute_name => :output_path

  def execute
    require "csv"

    tmp_dir = java.lang.System.getProperty("java.io.tmpdir")
    ruby_output_path = File.join(tmp_dir, SecureRandom.uuid)
    # Write a CSV with just the ruby stuff
    CSV.open(ruby_output_path, "wb", :headers => [ "name", "version", "url", "license" ], :write_headers => true) do |csv|
      puts "Finding gem dependencies"
      gems.each { |d| csv << d }
      puts "Finding gem embedded java/jar dependencies"
      jars.each { |d| csv << d }
    end
    puts "Wrote temporary ruby deps CSV to #{ruby_output_path}"

    # Use gradle to find the rest and add to the ruby CSV
    puts "Find gradle jar dependencies #{Dir.pwd}"
    command = ["./gradlew", "generateLicenseReport", "-PlicenseReportInputCSV=#{ruby_output_path}", "-PlicenseReportOutputCSV=#{output_path}"]
    puts "Executing #{command}"
    system(*command)
    if $?.exitstatus != 0
      raise "Could not run gradle java deps! Exit status #{$?.exitstatus}"
    end

    nil
  ensure
    FileUtils.rm(ruby_output_path) if ruby_output_path
  end

  def gems
    # @mgreau requested `logstash-*` dependencies be removed from this list:
    # https://github.com/elastic/logstash/pull/8837#issuecomment-351859433
    Gem::Specification.reject { |g| g.name =~ /^logstash-/ }.collect do |gem|
      licenses = ("UNKNOWN" if gem.licenses.empty?) || (gem.licenses.map { |l| SPDX.map(l) }.join("|") if !gem.licenses.empty?)
      [gem.name, gem.version.to_s, gem.homepage, licenses]
    end
  end

  def jars
    jars = []
    # For any gems with jar dependencies,
    #   Look at META-INF/MANIFEST.MF for any jars in each gem
    #   Note any important details.
    Gem::Specification.select { |g| g.requirements && g.requirements.any? { |r| r =~ /^jar / } }.collect do |gem|

      # Where is the gem installed
      root = gem.full_gem_path

      Dir.glob(File.join(root, "**", "*.jar")).collect do |path|
        jar = java.util.jar.JarFile.new(path)
        manifest = jar.getManifest

        pom_entries = jar.entries.select { |t| t.getName.start_with?("META-INF/maven/") && t.getName.end_with?("/pom.properties") }

        # Some jar files have multiple maven pom.properties files. It is unclear how to know what is correct?
        # TODO(sissel): Maybe we should use all pom.properties files? None of the pom.properties/pom.xml files have license information, though.
        # TODO(sissel): In some cases, there are META-INF/COPYING and
        #   META-INF/NOTICE.txt files? Can we use these somehow? There is no
        #   common syntax for parsing these files, though...
        pom_map = if pom_entries.count == 1
          pom_in = jar.getInputStream(pom_entries.first)
          pom_content = pom_in.available.times.collect { pom_in.read }.pack("C*")
          # Split non-comment lines by `key=val` into a map { key => val }
          Hash[pom_content.split(/\r?\n/).grep(/^[^#]/).map { |line| line.split("=", 2) }]
        else
          {}
        end

        next if manifest.nil?
        # convert manifest attributes to a map w/ keys .to_s
        # without this, the attribute keys will be `Object#inspect` values
        # like #<Java::JavaUtilJar::Attributes::Name0xabcdef0>
        attributes = Hash[manifest.getMainAttributes.map { |k,v| [k.to_s, v] }]

        begin
          # Prefer the maven/pom groupId when it is available.
          artifact = pom_map.fetch("artifactId", attributes.fetch("Implementation-Title"))
          group = pom_map.fetch("groupId", attributes.fetch("Implementation-Vendor-Id"))
          jars << [
            group + ":" + artifact,
            attributes.fetch("Bundle-Version"),
            attributes.fetch("Bundle-DocURL"),
            SPDX.map(attributes.fetch("Bundle-License")),
          ]
        rescue KeyError => e
          # The jar is missing a required manifest field, it may not have any useful manifest data.
          # Ignore it and move on.
        end
      end
    end
    jars.uniq.sort
  end

  module SPDX
    # This is a non-exhaustive, best effort list of licenses as they map to SPDX identifiers.
    ALIASES = {
      "Apache-2.0" => [
        "Apache 2",
        "apache-2.0",
        "Apache 2.0",
        "Apache License (2.0)",
        "Apache License 2.0",
        "https://www.apache.org/licenses/LICENSE-2.0.txt",
        "http://www.apache.org/licenses/LICENSE-2.0.txt",
      ],
      "Artistic-2.0" => [
        "Artistic 2.0"
      ],
      "BSD-2-Clause" => [
        "2-clause BSDL",
        "2-clause"
      ],
      "GPL-2.0" => [
        "GPL-2"
      ]
    }

    # Get a map of name => spdx
    MAP_APACHE2 = Hash[ALIASES.map { |spdx,aliases| aliases.map { |value| [value, spdx] } }[0]]
    MAP_ARTISTIC2 = Hash[ALIASES.map { |spdx,aliases| aliases.map { |value| [value, spdx] } }[1]]
    MAP_BSD = Hash[ALIASES.map { |spdx,aliases| aliases.map { |value| [value, spdx] } }[2]]
    MAP_GPL2 = Hash[ALIASES.map { |spdx,aliases| aliases.map { |value| [value, spdx] } }[3]]

    module_function
    def map(value)
      MAP_APACHE2[value] ||  MAP_ARTISTIC2[value] || MAP_BSD[value] ||  MAP_GPL2[value] || value
    end
  end
end
