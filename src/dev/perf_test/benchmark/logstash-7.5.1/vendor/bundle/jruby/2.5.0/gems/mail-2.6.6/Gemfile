source 'https://rubygems.org'

gemspec

gem 'tlsmail', '~> 0.0.1' if RUBY_VERSION <= '1.8.6'
gem 'jruby-openssl', :platforms => :jruby
gem 'rake', '< 11.0', :platforms => :ruby_18
gem 'rdoc', '< 4.3', :platforms => [ :ruby_18, :ruby_19 ]
gem 'mime-types', '< 2.0', :platforms => [ :ruby_18, :ruby_19 ]

# For gems not required to run tests
group :local_development, :test do
  gem 'appraisal', '~> 1.0' unless RUBY_VERSION < '1.9'
end
