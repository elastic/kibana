
lib = File.expand_path("../lib", __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require "back_pressure/version"

Gem::Specification.new do |spec|
  spec.name          = "back_pressure"
  spec.version       = BackPressure::VERSION
  spec.authors       = ["Ry Biesemeyer"]
  spec.email         = ["identity@yaauie.com"]
  spec.license       = 'Apache-2.0'

  spec.summary       = %q{Tools for providing blocking back-pressure}
  spec.description   = %q{BackPressure is a zero-dependency collection of stable-API tools } +
                       %q{for safely and efficiently providing blocking back-pressure.}
  spec.homepage      = "https://github.com/yaauie/ruby_back_pressure"

  spec.metadata      = {
      "source_code_uri" => "https://github.com/yaauie/ruby_back_pressure",
      "bug_tracker_uri" => "https://github.com/yaauie/ruby_back_pressure/issues",
  }

  # Specify which files should be added to the gem when it is released.
  # The `git ls-files -z` loads the files in the RubyGem that have been added into git.
  spec.files         = Dir.chdir(File.expand_path('..', __FILE__)) do
    `git ls-files -z`.split("\x0").reject { |f| f.match(%r{^(test|spec|features)/}) }
  end
  spec.bindir        = "exe"
  spec.executables   = spec.files.grep(%r{^exe/}) { |f| File.basename(f) }
  spec.require_paths = ["lib"]

  spec.required_ruby_version =  '>= 2.0'

  spec.add_development_dependency "bundler", "~> 2.0"
  spec.add_development_dependency "rake",    "~> 10.0"
  spec.add_development_dependency "rspec",   "~> 3.0"
  spec.add_development_dependency "yard",    "~> 0.9.20"
end
