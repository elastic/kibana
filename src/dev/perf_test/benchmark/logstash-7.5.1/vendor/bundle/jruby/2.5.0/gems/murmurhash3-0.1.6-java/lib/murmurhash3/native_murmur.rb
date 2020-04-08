require 'murmurhash3/aliaser'
require 'murmurhash3/native'

module MurmurHash3
  module Native32
    include MurmurHash3::Alias32
  end
  module Native128
    include MurmurHash3::Alias128
  end
end
