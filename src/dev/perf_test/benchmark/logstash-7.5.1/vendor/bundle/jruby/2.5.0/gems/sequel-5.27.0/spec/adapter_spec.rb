if !ARGV.empty? && ARGV.first != 'none'
  require_relative "adapters/#{ARGV.first}_spec"
end
Dir['./spec/integration/*_test.rb'].each{|f| require f}
