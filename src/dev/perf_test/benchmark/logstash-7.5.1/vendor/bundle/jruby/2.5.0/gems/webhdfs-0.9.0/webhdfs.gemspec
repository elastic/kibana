# encoding: utf-8
$:.push File.expand_path('../lib', __FILE__)

Gem::Specification.new do |gem|
  gem.name        = "webhdfs"
  gem.description = "Ruby WebHDFS/HttpFs client"
  gem.homepage    = "https://github.com/kzk/webhdfs/"
  gem.summary     = gem.description
  gem.version     = File.read("VERSION").strip
  gem.authors     = ["Kazuki Ohta", "Satoshi Tagomori"]
  gem.email       = ["kazuki.ohta@gmail.com", "tagomoris@gmail.com"]
  gem.has_rdoc    = false
  gem.files       = Dir['lib/**/*','test/**/*','*.gemspec','*.md','AUTHORS','COPYING','Gemfile','VERSION']
  gem.test_files  = gem.files.grep(%r{^(test|spec|features)/})
  gem.require_paths = ['lib']

  gem.add_development_dependency "rake"
  gem.add_development_dependency "rdoc"
  gem.add_development_dependency "simplecov"
  gem.add_development_dependency "rr"
  gem.add_runtime_dependency "addressable"
end
