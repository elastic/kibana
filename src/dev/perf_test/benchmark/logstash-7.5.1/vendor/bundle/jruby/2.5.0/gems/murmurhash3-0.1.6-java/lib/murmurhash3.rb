require "murmurhash3/version"

module MurmurHash3
  begin
    require 'murmurhash3/native_murmur'
    V32 = Native32
    V128 = Native128
  rescue LoadError
    require 'murmurhash3/pure_ruby'
    if RUBY_ENGINE == 'ruby'
      $stderr.puts "Attention: used pure ruby version of MurmurHash3"
    end
    V32 = PureRuby32
    V128 = PureRuby128
  end
end
