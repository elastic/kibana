guard 'minitest', :focus_on_failed => true do
  watch(%r{^test/.+_test\.rb$})
  watch(%r{^lib/lru_redux/(.+)\.rb$})     { |m| "test/#{m[1]}_test.rb" }
end


