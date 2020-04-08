# encoding: UTF-8

# This file contains data derived from the IANA Time Zone Database
# (http://www.iana.org/time-zones).

module TZInfo
  module Data
    module Definitions
      module Pacific
        module Majuro
          include TimezoneDefinition
          
          timezone 'Pacific/Majuro' do |tz|
            tz.offset :o0, 41088, 0, :LMT
            tz.offset :o1, 39600, 0, :'+11'
            tz.offset :o2, 32400, 0, :'+09'
            tz.offset :o3, 36000, 0, :'+10'
            tz.offset :o4, 43200, 0, :'+12'
            
            tz.transition 1900, 12, :o1, -2177493888, 1086923261, 450
            tz.transition 1914, 9, :o2, -1743678000, 58089745, 24
            tz.transition 1919, 1, :o1, -1606813200, 19375921, 8
            tz.transition 1936, 12, :o3, -1041418800, 58284817, 24
            tz.transition 1941, 3, :o2, -907408800, 29161021, 12
            tz.transition 1944, 1, :o1, -818067600, 19448953, 8
            tz.transition 1969, 9, :o4, -7988400, 58571881, 24
          end
        end
      end
    end
  end
end
