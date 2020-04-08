
# line 1 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/date_time_machine.rb.rl"

# line 10 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/date_time_machine.rb.rl"


module Mail
  module Parsers
    module Ragel
      module DateTimeMachine
        
# line 13 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/date_time_machine.rb"
class << self
	attr_accessor :_date_time_trans_keys
	private :_date_time_trans_keys, :_date_time_trans_keys=
end
self._date_time_trans_keys = [
	0, 0, 9, 87, 9, 87, 
	10, 10, 9, 32, 9, 
	87, 9, 83, 9, 83, 
	10, 10, 9, 32, 9, 83, 
	112, 117, 114, 114, 9, 
	57, 10, 10, 9, 32, 
	9, 57, 48, 57, 9, 57, 
	9, 57, 10, 10, 9, 
	32, 9, 57, 48, 57, 
	9, 58, 10, 10, 9, 32, 
	9, 58, 9, 57, 10, 
	10, 9, 32, 9, 57, 
	48, 57, 9, 58, 9, 122, 
	10, 10, 9, 32, 9, 
	58, 9, 57, 10, 10, 
	9, 32, 9, 57, 48, 57, 
	9, 40, 9, 122, 10, 
	10, 9, 32, 9, 40, 
	48, 57, 48, 57, 48, 57, 
	48, 57, 10, 10, 9, 
	32, 84, 84, 103, 103, 
	101, 101, 99, 99, 101, 101, 
	98, 98, 97, 117, 110, 
	110, 108, 110, 97, 97, 
	114, 121, 111, 111, 118, 118, 
	99, 99, 116, 116, 101, 
	101, 112, 112, 114, 114, 
	105, 105, 9, 44, 10, 10, 
	9, 32, 9, 44, 9, 
	57, 9, 57, 10, 10, 
	9, 32, 9, 57, 111, 111, 
	110, 110, 97, 117, 116, 
	116, 104, 117, 117, 117, 
	101, 101, 101, 101, 100, 100, 
	1, 127, 1, 127, 10, 
	10, 9, 32, 0, 127, 
	9, 40, 9, 40, 9, 40, 
	9, 83, 9, 77, 9, 
	84, 0, 0, 0
]

class << self
	attr_accessor :_date_time_key_spans
	private :_date_time_key_spans, :_date_time_key_spans=
end
self._date_time_key_spans = [
	0, 79, 79, 1, 24, 79, 75, 75, 
	1, 24, 75, 6, 1, 49, 1, 24, 
	49, 10, 49, 49, 1, 24, 49, 10, 
	50, 1, 24, 50, 49, 1, 24, 49, 
	10, 50, 114, 1, 24, 50, 49, 1, 
	24, 49, 10, 32, 114, 1, 24, 32, 
	10, 10, 10, 10, 1, 24, 1, 1, 
	1, 1, 1, 1, 21, 1, 3, 1, 
	8, 1, 1, 1, 1, 1, 1, 1, 
	1, 36, 1, 24, 36, 49, 49, 1, 
	24, 49, 1, 1, 21, 1, 14, 1, 
	1, 1, 1, 127, 127, 1, 24, 128, 
	32, 32, 32, 75, 69, 76, 0
]

class << self
	attr_accessor :_date_time_index_offsets
	private :_date_time_index_offsets, :_date_time_index_offsets=
end
self._date_time_index_offsets = [
	0, 0, 80, 160, 162, 187, 267, 343, 
	419, 421, 446, 522, 529, 531, 581, 583, 
	608, 658, 669, 719, 769, 771, 796, 846, 
	857, 908, 910, 935, 986, 1036, 1038, 1063, 
	1113, 1124, 1175, 1290, 1292, 1317, 1368, 1418, 
	1420, 1445, 1495, 1506, 1539, 1654, 1656, 1681, 
	1714, 1725, 1736, 1747, 1758, 1760, 1785, 1787, 
	1789, 1791, 1793, 1795, 1797, 1819, 1821, 1825, 
	1827, 1836, 1838, 1840, 1842, 1844, 1846, 1848, 
	1850, 1852, 1889, 1891, 1916, 1953, 2003, 2053, 
	2055, 2080, 2130, 2132, 2134, 2156, 2158, 2173, 
	2175, 2177, 2179, 2181, 2309, 2437, 2439, 2464, 
	2593, 2626, 2659, 2692, 2768, 2838, 2915
]

class << self
	attr_accessor :_date_time_indicies
	private :_date_time_indicies, :_date_time_indicies=
end
self._date_time_indicies = [
	0, 1, 1, 1, 2, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 0, 
	1, 1, 1, 1, 1, 1, 1, 3, 
	1, 1, 1, 1, 1, 1, 1, 4, 
	4, 4, 4, 4, 4, 4, 4, 4, 
	4, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 5, 1, 1, 
	1, 1, 1, 1, 6, 1, 1, 1, 
	1, 1, 7, 8, 1, 1, 9, 1, 
	10, 1, 1, 1, 11, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 10, 
	1, 1, 1, 1, 1, 1, 1, 12, 
	1, 1, 1, 1, 1, 1, 1, 13, 
	13, 13, 13, 13, 13, 13, 13, 13, 
	13, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 5, 1, 1, 
	1, 1, 1, 1, 6, 1, 1, 1, 
	1, 1, 7, 8, 1, 1, 9, 1, 
	14, 1, 10, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 10, 1, 15, 1, 1, 1, 16, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 15, 1, 1, 1, 1, 1, 
	1, 1, 17, 1, 1, 1, 1, 1, 
	1, 1, 18, 18, 18, 18, 18, 18, 
	18, 18, 18, 18, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	19, 1, 1, 1, 1, 1, 1, 20, 
	1, 1, 1, 1, 1, 21, 22, 1, 
	1, 23, 1, 24, 1, 1, 1, 25, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 24, 1, 1, 1, 1, 1, 
	1, 1, 26, 1, 1, 1, 1, 1, 
	1, 1, 24, 24, 24, 24, 24, 24, 
	24, 24, 24, 24, 1, 1, 1, 1, 
	1, 1, 1, 27, 1, 1, 28, 1, 
	29, 1, 1, 1, 30, 1, 1, 31, 
	32, 33, 1, 1, 1, 34, 1, 24, 
	1, 1, 1, 25, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 24, 1, 
	1, 1, 1, 1, 1, 1, 26, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 27, 
	1, 1, 28, 1, 29, 1, 1, 1, 
	30, 1, 1, 31, 32, 33, 1, 1, 
	1, 34, 1, 35, 1, 24, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 24, 1, 36, 1, 
	1, 1, 37, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 36, 1, 1, 
	1, 1, 1, 1, 1, 38, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 39, 1, 
	1, 40, 1, 41, 1, 1, 1, 42, 
	1, 1, 43, 44, 45, 1, 1, 1, 
	46, 1, 47, 1, 1, 1, 1, 48, 
	1, 49, 1, 49, 1, 1, 1, 50, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 49, 1, 1, 1, 1, 1, 
	1, 1, 51, 1, 1, 1, 1, 1, 
	1, 1, 52, 52, 52, 52, 52, 52, 
	52, 52, 52, 52, 1, 53, 1, 49, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 49, 1, 
	54, 1, 1, 1, 55, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 54, 
	1, 1, 1, 1, 1, 1, 1, 56, 
	1, 1, 1, 1, 1, 1, 1, 57, 
	57, 57, 57, 57, 57, 57, 57, 57, 
	57, 1, 58, 58, 58, 58, 58, 58, 
	58, 58, 58, 58, 1, 59, 1, 1, 
	1, 60, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 59, 1, 1, 1, 
	1, 1, 1, 1, 61, 1, 1, 1, 
	1, 1, 1, 1, 58, 58, 58, 58, 
	58, 58, 58, 58, 58, 58, 1, 59, 
	1, 1, 1, 60, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 59, 1, 
	1, 1, 1, 1, 1, 1, 61, 1, 
	1, 1, 1, 1, 1, 1, 62, 62, 
	62, 62, 62, 62, 62, 62, 62, 62, 
	1, 63, 1, 59, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 59, 1, 64, 1, 1, 1, 
	65, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 64, 1, 1, 1, 1, 
	1, 1, 1, 66, 1, 1, 1, 1, 
	1, 1, 1, 67, 67, 67, 67, 67, 
	67, 67, 67, 67, 67, 1, 68, 68, 
	68, 68, 68, 68, 68, 68, 68, 68, 
	1, 68, 1, 1, 1, 69, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	68, 1, 1, 1, 1, 1, 1, 1, 
	70, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 71, 1, 72, 1, 68, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 68, 1, 73, 
	1, 1, 1, 74, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 73, 1, 
	1, 1, 1, 1, 1, 1, 75, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	76, 1, 71, 1, 1, 1, 77, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 71, 1, 1, 1, 1, 1, 1, 
	1, 78, 1, 1, 1, 1, 1, 1, 
	1, 79, 79, 79, 79, 79, 79, 79, 
	79, 79, 79, 1, 80, 1, 71, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 71, 1, 76, 
	1, 1, 1, 81, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 76, 1, 
	1, 1, 1, 1, 1, 1, 82, 1, 
	1, 1, 1, 1, 1, 1, 83, 83, 
	83, 83, 83, 83, 83, 83, 83, 83, 
	1, 84, 84, 84, 84, 84, 84, 84, 
	84, 84, 84, 1, 85, 1, 1, 1, 
	86, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 85, 1, 1, 1, 1, 
	1, 1, 1, 87, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 88, 1, 85, 
	1, 1, 1, 86, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 85, 1, 
	1, 1, 1, 1, 1, 1, 87, 1, 
	1, 89, 1, 89, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	88, 1, 1, 1, 1, 1, 1, 90, 
	90, 91, 90, 91, 90, 92, 90, 90, 
	1, 90, 90, 91, 90, 90, 91, 90, 
	90, 90, 90, 93, 90, 90, 90, 90, 
	90, 1, 1, 1, 1, 1, 1, 90, 
	90, 90, 90, 90, 90, 90, 90, 90, 
	1, 90, 90, 90, 90, 90, 90, 90, 
	90, 90, 90, 90, 90, 90, 90, 90, 
	90, 1, 94, 1, 85, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 85, 1, 95, 1, 1, 
	1, 96, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 95, 1, 1, 1, 
	1, 1, 1, 1, 97, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 98, 1, 
	88, 1, 1, 1, 99, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 88, 
	1, 1, 1, 1, 1, 1, 1, 100, 
	1, 1, 1, 1, 1, 1, 1, 101, 
	101, 101, 101, 101, 101, 101, 101, 101, 
	101, 1, 102, 1, 88, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 88, 1, 98, 1, 1, 
	1, 103, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 98, 1, 1, 1, 
	1, 1, 1, 1, 104, 1, 1, 1, 
	1, 1, 1, 1, 105, 105, 105, 105, 
	105, 105, 105, 105, 105, 105, 1, 106, 
	106, 106, 106, 106, 106, 106, 106, 106, 
	106, 1, 107, 1, 1, 1, 108, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 107, 1, 1, 1, 1, 1, 1, 
	1, 109, 1, 107, 1, 1, 1, 108, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 107, 1, 1, 1, 1, 1, 
	1, 1, 109, 1, 1, 89, 1, 89, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 90, 90, 91, 90, 91, 
	90, 92, 90, 90, 1, 90, 90, 91, 
	90, 90, 91, 90, 90, 90, 90, 93, 
	90, 90, 90, 90, 90, 1, 1, 1, 
	1, 1, 1, 90, 90, 90, 90, 90, 
	90, 90, 90, 90, 1, 90, 90, 90, 
	90, 90, 90, 90, 90, 90, 90, 90, 
	90, 90, 90, 90, 90, 1, 110, 1, 
	107, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 107, 
	1, 111, 1, 1, 1, 112, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	111, 1, 1, 1, 1, 1, 1, 1, 
	113, 1, 114, 114, 114, 114, 114, 114, 
	114, 114, 114, 114, 1, 115, 115, 115, 
	115, 115, 115, 115, 115, 115, 115, 1, 
	116, 116, 116, 116, 116, 116, 116, 116, 
	116, 116, 1, 90, 90, 90, 90, 90, 
	90, 90, 90, 90, 90, 1, 117, 1, 
	118, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 118, 
	1, 90, 1, 49, 1, 119, 1, 49, 
	1, 120, 1, 49, 1, 121, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 122, 1, 49, 1, 49, 1, 49, 
	1, 123, 1, 49, 1, 1, 1, 1, 
	1, 1, 49, 1, 124, 1, 49, 1, 
	125, 1, 49, 1, 126, 1, 49, 1, 
	127, 1, 128, 1, 128, 1, 1, 1, 
	129, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 128, 1, 1, 1, 1, 
	1, 1, 1, 130, 1, 1, 1, 131, 
	1, 132, 1, 128, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 128, 1, 133, 1, 1, 1, 
	134, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 133, 1, 1, 1, 1, 
	1, 1, 1, 135, 1, 1, 1, 136, 
	1, 137, 1, 1, 1, 138, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	137, 1, 1, 1, 1, 1, 1, 1, 
	139, 1, 1, 1, 1, 1, 1, 1, 
	4, 4, 4, 4, 4, 4, 4, 4, 
	4, 4, 1, 140, 1, 1, 1, 141, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 140, 1, 1, 1, 1, 1, 
	1, 1, 142, 1, 1, 1, 1, 1, 
	1, 1, 13, 13, 13, 13, 13, 13, 
	13, 13, 13, 13, 1, 143, 1, 140, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 140, 1, 
	144, 1, 1, 1, 145, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 144, 
	1, 1, 1, 1, 1, 1, 1, 146, 
	1, 1, 1, 1, 1, 1, 1, 18, 
	18, 18, 18, 18, 18, 18, 18, 18, 
	18, 1, 147, 1, 128, 1, 148, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 147, 1, 128, 1, 149, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 150, 1, 128, 1, 128, 
	1, 151, 1, 128, 1, 152, 152, 152, 
	152, 152, 152, 152, 152, 152, 1, 152, 
	152, 153, 152, 152, 152, 152, 152, 152, 
	152, 152, 152, 152, 152, 152, 152, 152, 
	152, 152, 152, 152, 152, 152, 152, 152, 
	152, 152, 152, 152, 154, 155, 152, 152, 
	152, 152, 152, 152, 152, 152, 152, 152, 
	152, 152, 152, 152, 152, 152, 152, 152, 
	152, 152, 152, 152, 152, 152, 152, 152, 
	152, 152, 152, 152, 152, 152, 152, 152, 
	152, 152, 152, 152, 152, 152, 152, 152, 
	152, 152, 152, 152, 152, 152, 152, 152, 
	156, 152, 152, 152, 152, 152, 152, 152, 
	152, 152, 152, 152, 152, 152, 152, 152, 
	152, 152, 152, 152, 152, 152, 152, 152, 
	152, 152, 152, 152, 152, 152, 152, 152, 
	152, 152, 152, 152, 1, 157, 157, 157, 
	157, 157, 157, 157, 157, 157, 1, 157, 
	157, 158, 157, 157, 157, 157, 157, 157, 
	157, 157, 157, 157, 157, 157, 157, 157, 
	157, 157, 157, 157, 157, 157, 157, 157, 
	157, 157, 157, 157, 159, 160, 157, 157, 
	157, 157, 157, 157, 157, 157, 157, 157, 
	157, 157, 157, 157, 157, 157, 157, 157, 
	157, 157, 157, 157, 157, 157, 157, 157, 
	157, 157, 157, 157, 157, 157, 157, 157, 
	157, 157, 157, 157, 157, 157, 157, 157, 
	157, 157, 157, 157, 157, 157, 157, 157, 
	161, 157, 157, 157, 157, 157, 157, 157, 
	157, 157, 157, 157, 157, 157, 157, 157, 
	157, 157, 157, 157, 157, 157, 157, 157, 
	157, 157, 157, 157, 157, 157, 157, 157, 
	157, 157, 157, 157, 1, 162, 1, 157, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 157, 1, 
	157, 157, 157, 157, 157, 157, 157, 157, 
	157, 157, 157, 157, 157, 157, 157, 157, 
	157, 157, 157, 157, 157, 157, 157, 157, 
	157, 157, 157, 157, 157, 157, 157, 157, 
	157, 157, 157, 157, 157, 157, 157, 157, 
	157, 157, 157, 157, 157, 157, 157, 157, 
	157, 157, 157, 157, 157, 157, 157, 157, 
	157, 157, 157, 157, 157, 157, 157, 157, 
	157, 157, 157, 157, 157, 157, 157, 157, 
	157, 157, 157, 157, 157, 157, 157, 157, 
	157, 157, 157, 157, 157, 157, 157, 157, 
	157, 157, 157, 157, 157, 157, 157, 157, 
	157, 157, 157, 157, 157, 157, 157, 157, 
	157, 157, 157, 157, 157, 157, 157, 157, 
	157, 157, 157, 157, 157, 157, 157, 157, 
	157, 157, 157, 157, 157, 157, 157, 157, 
	1, 163, 1, 1, 1, 164, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	163, 1, 1, 1, 1, 1, 1, 1, 
	165, 1, 118, 1, 1, 1, 166, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 118, 1, 1, 1, 1, 1, 1, 
	1, 167, 1, 168, 1, 1, 1, 169, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 168, 1, 1, 1, 1, 1, 
	1, 1, 170, 1, 163, 1, 1, 1, 
	164, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 163, 1, 1, 1, 1, 
	1, 1, 1, 165, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 171, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 171, 1, 
	163, 1, 1, 1, 164, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 163, 
	1, 1, 1, 1, 1, 1, 1, 165, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 171, 1, 163, 1, 
	1, 1, 164, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 163, 1, 1, 
	1, 1, 1, 1, 1, 165, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 90, 1, 1, 0
]

class << self
	attr_accessor :_date_time_trans_targs
	private :_date_time_trans_targs, :_date_time_trans_targs=
end
self._date_time_trans_targs = [
	2, 0, 3, 5, 6, 71, 82, 84, 
	86, 89, 2, 3, 5, 6, 4, 2, 
	3, 5, 6, 71, 82, 84, 86, 89, 
	7, 8, 10, 11, 56, 58, 60, 63, 
	65, 67, 69, 9, 7, 8, 10, 11, 
	56, 58, 60, 63, 65, 67, 69, 12, 
	55, 13, 14, 16, 17, 15, 13, 14, 
	16, 17, 18, 19, 20, 22, 23, 21, 
	19, 20, 22, 23, 24, 25, 27, 28, 
	26, 24, 25, 27, 28, 29, 31, 32, 
	30, 29, 31, 32, 33, 34, 35, 37, 
	38, 48, 96, 99, 100, 101, 36, 34, 
	35, 37, 38, 39, 41, 42, 40, 39, 
	41, 42, 43, 44, 45, 47, 46, 44, 
	45, 47, 49, 50, 51, 53, 97, 57, 
	59, 61, 62, 64, 66, 68, 70, 72, 
	73, 74, 76, 77, 75, 73, 74, 76, 
	77, 78, 79, 81, 78, 79, 81, 80, 
	78, 79, 81, 83, 85, 87, 88, 90, 
	92, 93, 92, 102, 95, 92, 93, 92, 
	102, 95, 94, 97, 52, 98, 52, 98, 
	97, 52, 98, 54
]

class << self
	attr_accessor :_date_time_trans_actions
	private :_date_time_trans_actions, :_date_time_trans_actions=
end
self._date_time_trans_actions = [
	1, 0, 1, 2, 1, 0, 0, 0, 
	0, 0, 0, 0, 3, 0, 0, 4, 
	4, 5, 4, 4, 4, 4, 4, 4, 
	0, 0, 3, 0, 0, 0, 0, 0, 
	0, 0, 0, 0, 4, 4, 5, 4, 
	4, 4, 4, 4, 4, 4, 4, 0, 
	0, 0, 0, 3, 0, 0, 4, 4, 
	5, 4, 0, 0, 0, 3, 6, 0, 
	4, 4, 5, 7, 0, 0, 3, 0, 
	0, 4, 4, 5, 4, 0, 3, 0, 
	0, 4, 5, 4, 0, 0, 0, 3, 
	0, 0, 0, 0, 0, 0, 0, 4, 
	4, 5, 4, 0, 3, 0, 0, 4, 
	5, 4, 0, 0, 0, 3, 0, 4, 
	4, 5, 0, 0, 0, 0, 0, 0, 
	0, 0, 0, 0, 0, 0, 0, 0, 
	0, 0, 3, 0, 0, 4, 4, 5, 
	4, 1, 1, 8, 0, 0, 3, 0, 
	4, 4, 5, 0, 0, 0, 0, 0, 
	9, 9, 10, 11, 9, 0, 0, 3, 
	12, 0, 0, 13, 13, 14, 0, 3, 
	4, 4, 5, 0
]

class << self
	attr_accessor :_date_time_eof_actions
	private :_date_time_eof_actions, :_date_time_eof_actions=
end
self._date_time_eof_actions = [
	0, 0, 0, 0, 0, 0, 0, 0, 
	0, 0, 0, 0, 0, 0, 0, 0, 
	0, 0, 0, 0, 0, 0, 0, 0, 
	0, 0, 0, 0, 0, 0, 0, 0, 
	0, 0, 0, 0, 0, 0, 0, 0, 
	0, 0, 0, 0, 0, 0, 0, 0, 
	0, 0, 0, 0, 0, 0, 0, 0, 
	0, 0, 0, 0, 0, 0, 0, 0, 
	0, 0, 0, 0, 0, 0, 0, 0, 
	0, 0, 0, 0, 0, 0, 0, 0, 
	0, 0, 0, 0, 0, 0, 0, 0, 
	0, 0, 0, 0, 0, 0, 0, 0, 
	13, 0, 4, 13, 13, 13, 0
]

class << self
	attr_accessor :date_time_start
end
self.date_time_start = 1;
class << self
	attr_accessor :date_time_first_final
end
self.date_time_first_final = 96;
class << self
	attr_accessor :date_time_error
end
self.date_time_error = 0;

class << self
	attr_accessor :date_time_en_comment_tail
end
self.date_time_en_comment_tail = 91;
class << self
	attr_accessor :date_time_en_main
end
self.date_time_en_main = 1;


# line 17 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/date_time_machine.rb.rl"

        def self.parse(data)
          p = 0
          eof = data.length
          stack = []

          actions = []
          data_unpacked = data.bytes.to_a
          
# line 583 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/date_time_machine.rb"
begin
	p ||= 0
	pe ||= data.length
	cs = date_time_start
	top = 0
end

# line 26 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/date_time_machine.rb.rl"
          
# line 593 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/date_time_machine.rb"
begin
	testEof = false
	_slen, _trans, _keys, _inds, _acts, _nacts = nil
	_goto_level = 0
	_resume = 10
	_eof_trans = 15
	_again = 20
	_test_eof = 30
	_out = 40
	while true
	if _goto_level <= 0
	if p == pe
		_goto_level = _test_eof
		next
	end
	if cs == 0
		_goto_level = _out
		next
	end
	end
	if _goto_level <= _resume
	_keys = cs << 1
	_inds = _date_time_index_offsets[cs]
	_slen = _date_time_key_spans[cs]
	_trans = if (   _slen > 0 && 
			_date_time_trans_keys[_keys] <= ( data_unpacked[p]) && 
			( data_unpacked[p]) <= _date_time_trans_keys[_keys + 1] 
		    ) then
			_date_time_indicies[ _inds + ( data_unpacked[p]) - _date_time_trans_keys[_keys] ] 
		 else 
			_date_time_indicies[ _inds + _slen ]
		 end
	cs = _date_time_trans_targs[_trans]
	if _date_time_trans_actions[_trans] != 0
	case _date_time_trans_actions[_trans]
	when 4 then
# line 7 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(4, p) 		end
	when 9 then
# line 8 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(5, p) 		end
	when 1 then
# line 12 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(9, p) 		end
	when 13 then
# line 47 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(44, p) 		end
	when 3 then
# line 5 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/../../common.rl"
		begin
 	begin
		stack[top] = cs
		top+= 1
		cs = 91
		_goto_level = _again
		next
	end
 		end
	when 12 then
# line 6 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/../../common.rl"
		begin
 	begin
		top -= 1
		cs = stack[top]
		_goto_level = _again
		next
	end
 		end
	when 5 then
# line 7 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(4, p) 		end
# line 5 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/../../common.rl"
		begin
 	begin
		stack[top] = cs
		top+= 1
		cs = 91
		_goto_level = _again
		next
	end
 		end
	when 10 then
# line 8 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(5, p) 		end
# line 5 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/../../common.rl"
		begin
 	begin
		stack[top] = cs
		top+= 1
		cs = 91
		_goto_level = _again
		next
	end
 		end
	when 11 then
# line 8 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(5, p) 		end
# line 6 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/../../common.rl"
		begin
 	begin
		top -= 1
		cs = stack[top]
		_goto_level = _again
		next
	end
 		end
	when 6 then
# line 11 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(8, p) 		end
# line 48 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(45, p) 		end
	when 8 then
# line 12 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(9, p) 		end
# line 5 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/../../common.rl"
		begin
 	begin
		stack[top] = cs
		top+= 1
		cs = 91
		_goto_level = _again
		next
	end
 		end
	when 14 then
# line 47 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(44, p) 		end
# line 5 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/../../common.rl"
		begin
 	begin
		stack[top] = cs
		top+= 1
		cs = 91
		_goto_level = _again
		next
	end
 		end
	when 2 then
# line 5 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/../../common.rl"
		begin
 	begin
		stack[top] = cs
		top+= 1
		cs = 91
		_goto_level = _again
		next
	end
 		end
# line 12 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(9, p) 		end
	when 7 then
# line 7 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(4, p) 		end
# line 11 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(8, p) 		end
# line 48 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(45, p) 		end
# line 766 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/date_time_machine.rb"
	end
	end
	end
	if _goto_level <= _again
	if cs == 0
		_goto_level = _out
		next
	end
	p += 1
	if p != pe
		_goto_level = _resume
		next
	end
	end
	if _goto_level <= _test_eof
	if p == eof
	  case _date_time_eof_actions[cs]
	when 4 then
# line 7 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(4, p) 		end
	when 13 then
# line 47 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(44, p) 		end
# line 792 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/date_time_machine.rb"
	  end
	end

	end
	if _goto_level <= _out
		break
	end
end
	end

# line 27 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/date_time_machine.rb.rl"

          if p == eof && cs >= 
# line 806 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/date_time_machine.rb"
96
# line 28 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/date_time_machine.rb.rl"

            return actions, nil
          else
            return [], "Only able to parse up to #{data[0..p]}"
          end
        end
      end
    end
  end
end
