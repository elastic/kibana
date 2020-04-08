# -*- encoding: utf-8 -*-

# Update these to get proper version and commit history

Gem::Specification.new do |s|
  s.name = %q{atomic}
  s.version = "1.1.101"
  s.authors = ["Charles Oliver Nutter", "MenTaLguY", "Sokolov Yura"]
  s.date = Time.now.strftime('%Y-%m-%d')
  s.summary = "An atomic reference implementation for JRuby, Rubinius, and MRI"
  s.description = s.summary
  s.email = ["headius@headius.com", "mental@rydia.net", "funny.falcon@gmail.com"]
  s.homepage = "http://github.com/ruby-concurrency/atomic"
  s.require_paths = ["lib"]
  s.licenses = ["Apache-2.0"]
  s.test_files = Dir["test/test*.rb"]
  if defined?(JRUBY_VERSION)
    s.files = Dir['lib/atomic_reference.jar']
    s.platform = 'java'
  else
    s.extensions = 'ext/extconf.rb'
  end
  s.files += `git ls-files`.lines.map(&:chomp)
  s.post_install_message = 'This gem has been deprecated and merged into Concurrent Ruby (http://concurrent-ruby.com).'
end
