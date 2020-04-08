require 'jars/maven_exec'

module Jars
  class JarDetails < Array
    def scope
      self[-2].to_sym
    end

    def file
      file = self[-1].strip
      file.empty? ? path : file
    end

    def group_id
      self[0]
    end

    def artifact_id
      self[1]
    end

    def version
      self[-3]
    end

    def classifier
      size == 5 ? nil : self[2]
    end

    def gacv
      classifier ? self[0..3] : self[0..2]
    end

    def path
      if scope == :system
        # replace maven like system properties embedded into the string
        self[-1].gsub(/\$\{[a-zA-Z.]+\}/) do |a|
          ENV_JAVA[a[2..-2]] || a
        end
      else
        File.join(Jars.home, group_id.gsub(/[.]/, '/'), artifact_id, version, gacv[1..-1].join('-') + '.jar')
      end
    end
  end

  class Lock
    def initialize(file)
      @file = file
    end

    def process(scope)
      scope ||= :runtime
      File.read(@file).each_line do |line|
        next if line !~ /:.+:/
        jar = JarDetails.new(line.strip.sub(/:jar:/, ':').sub(/:$/, ': ').split(/:/))
        case scope
        when :all
          yield jar
        when :compile
          # jar.scope is maven scope
          yield jar if jar.scope != :test
        when :provided
          # jar.scope is maven scope
          yield jar if jar.scope == :provided
        when :runtime
          # jar.scope is maven scope
          yield jar if (jar.scope != :test) && (jar.scope != :provided)
        when :test
          yield jar
        end
      end
    end
  end
end
