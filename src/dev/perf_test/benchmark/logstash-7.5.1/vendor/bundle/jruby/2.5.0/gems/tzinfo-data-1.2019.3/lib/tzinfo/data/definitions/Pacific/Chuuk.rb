# encoding: UTF-8

# This file contains data derived from the IANA Time Zone Database
# (http://www.iana.org/time-zones).

module TZInfo
  module Data
    module Definitions
      module Pacific
        module Chuuk
          include TimezoneDefinition
          
          timezone 'Pacific/Chuuk' do |tz|
            tz.offset :o0, -49972, 0, :LMT
            tz.offset :o1, 36428, 0, :LMT
            tz.offset :o2, 36000, 0, :'+10'
            tz.offset :o3, 32400, 0, :'+09'
            
            tz.transition 1844, 12, :o1, -3944628428, 51730532893, 21600
            tz.transition 1900, 12, :o2, -2177489228, 52172317693, 21600
            tz.transition 1914, 9, :o3, -1743674400, 29044873, 12
            tz.transition 1919, 1, :o2, -1606813200, 19375921, 8
            tz.transition 1941, 3, :o3, -907408800, 29161021, 12
            tz.transition 1945, 7, :o2, -770634000, 19453345, 8
          end
        end
      end
    end
  end
end
