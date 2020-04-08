module Paquet
  class Dependency
    attr_reader :name, :version, :platform

    def initialize(name, version, platform)
      @name = name
      @version = version
      @platform = platform
    end

    def to_s
      "#{name}-#{version}"
    end

    def ruby?
      platform == "ruby"
    end
  end
end
