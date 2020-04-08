Dir[File.join(File.dirname(__FILE__), 'type', '*.rb')].each do |file|
  require file
end
