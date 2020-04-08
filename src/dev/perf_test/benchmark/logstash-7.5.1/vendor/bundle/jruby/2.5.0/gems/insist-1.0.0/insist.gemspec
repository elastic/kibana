Gem::Specification.new do |spec|
  files = %x{git ls-files}.split("\n")

  spec.name = "insist"
  spec.version = "1.0.0"
  spec.summary = "A simple block-driven assertion library for both testing and for production code"
  spec.description = spec.summary
  spec.license = "Apache 2"

  # Note: You should set the version explicitly.
  #spec.add_dependency "cabin", ">0" # for logging. apache 2 license
  spec.files = files
  spec.require_paths << "lib"
  spec.bindir = "bin"

  spec.authors = ["Jordan Sissel"]
  spec.email = ["jls@semicomplete.com"]
  #spec.homepage = "..."
end

