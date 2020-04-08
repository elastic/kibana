require 'murmurhash3/aliaser'
if RUBY_ENGINE == 'jruby'
  require 'murmurhash3/native'
else
  require 'murmurhash3/native'
end

module MurmurHash3
  module Native32
    include MurmurHash3::Alias32
  end
  #module Native128
  #  include MurmurHash3::Alias128
  #end
end
