
# line 1 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/content_type_machine.rb.rl"

# line 10 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/content_type_machine.rb.rl"


module Mail
  module Parsers
    module Ragel
      module ContentTypeMachine
        
# line 13 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/content_type_machine.rb"
class << self
	attr_accessor :_content_type_trans_keys
	private :_content_type_trans_keys, :_content_type_trans_keys=
end
self._content_type_trans_keys = [
	0, 0, 33, 126, 33, 126, 
	33, 126, 9, 126, 10, 
	10, 9, 32, 33, 126, 
	9, 126, 9, 40, 10, 10, 
	9, 32, 1, 127, 1, 
	127, 10, 10, 9, 32, 
	10, 10, 9, 32, 9, 126, 
	9, 126, 10, 10, 9, 
	32, 9, 126, 0, 127, 
	9, 40, 10, 10, 9, 32, 
	9, 126, 1, 127, 1, 
	127, 10, 10, 9, 32, 
	0, 127, 9, 126, 9, 59, 
	9, 126, 9, 126, 9, 
	126, 9, 126, 9, 126, 
	0, 0, 0
]

class << self
	attr_accessor :_content_type_key_spans
	private :_content_type_key_spans, :_content_type_key_spans=
end
self._content_type_key_spans = [
	0, 94, 94, 94, 118, 1, 24, 94, 
	118, 32, 1, 24, 127, 127, 1, 24, 
	1, 24, 118, 118, 1, 24, 118, 128, 
	32, 1, 24, 118, 127, 127, 1, 24, 
	128, 118, 51, 118, 118, 118, 118, 118, 
	0
]

class << self
	attr_accessor :_content_type_index_offsets
	private :_content_type_index_offsets, :_content_type_index_offsets=
end
self._content_type_index_offsets = [
	0, 0, 95, 190, 285, 404, 406, 431, 
	526, 645, 678, 680, 705, 833, 961, 963, 
	988, 990, 1015, 1134, 1253, 1255, 1280, 1399, 
	1528, 1561, 1563, 1588, 1707, 1835, 1963, 1965, 
	1990, 2119, 2238, 2290, 2409, 2528, 2647, 2766, 
	2885
]

class << self
	attr_accessor :_content_type_indicies
	private :_content_type_indicies, :_content_type_indicies=
end
self._content_type_indicies = [
	0, 0, 0, 0, 0, 0, 0, 1, 
	1, 0, 0, 0, 0, 0, 1, 0, 
	0, 0, 0, 0, 0, 0, 0, 0, 
	0, 1, 1, 1, 1, 1, 1, 1, 
	0, 0, 0, 0, 0, 0, 0, 0, 
	0, 0, 0, 0, 0, 0, 0, 0, 
	0, 0, 0, 0, 0, 0, 0, 0, 
	0, 0, 1, 1, 1, 0, 0, 0, 
	0, 0, 0, 0, 0, 0, 0, 0, 
	0, 0, 0, 0, 0, 0, 0, 0, 
	0, 0, 0, 0, 0, 0, 0, 0, 
	0, 0, 0, 0, 0, 0, 1, 2, 
	2, 2, 2, 2, 2, 2, 1, 1, 
	2, 2, 2, 2, 2, 3, 2, 2, 
	2, 2, 2, 2, 2, 2, 2, 2, 
	1, 1, 1, 1, 1, 1, 1, 2, 
	2, 2, 2, 2, 2, 2, 2, 2, 
	2, 2, 2, 2, 2, 2, 2, 2, 
	2, 2, 2, 2, 2, 2, 2, 2, 
	2, 1, 1, 1, 2, 2, 2, 2, 
	2, 2, 2, 2, 2, 2, 2, 2, 
	2, 2, 2, 2, 2, 2, 2, 2, 
	2, 2, 2, 2, 2, 2, 2, 2, 
	2, 2, 2, 2, 2, 1, 4, 4, 
	4, 4, 4, 4, 4, 1, 1, 4, 
	4, 4, 4, 4, 1, 4, 4, 4, 
	4, 4, 4, 4, 4, 4, 4, 1, 
	1, 1, 1, 1, 1, 1, 4, 4, 
	4, 4, 4, 4, 4, 4, 4, 4, 
	4, 4, 4, 4, 4, 4, 4, 4, 
	4, 4, 4, 4, 4, 4, 4, 4, 
	1, 1, 1, 4, 4, 4, 4, 4, 
	4, 4, 4, 4, 4, 4, 4, 4, 
	4, 4, 4, 4, 4, 4, 4, 4, 
	4, 4, 4, 4, 4, 4, 4, 4, 
	4, 4, 4, 4, 1, 5, 1, 1, 
	1, 6, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 5, 7, 7, 7, 
	7, 7, 7, 7, 8, 1, 7, 7, 
	7, 7, 7, 1, 7, 7, 7, 7, 
	7, 7, 7, 7, 7, 7, 1, 9, 
	1, 1, 1, 1, 1, 7, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 1, 
	1, 1, 7, 7, 7, 7, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	7, 7, 7, 1, 10, 1, 5, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 5, 1, 11, 
	11, 11, 11, 11, 11, 11, 1, 1, 
	11, 11, 11, 11, 11, 1, 11, 11, 
	11, 11, 11, 11, 11, 11, 11, 11, 
	1, 1, 1, 12, 1, 1, 1, 11, 
	11, 11, 11, 11, 11, 11, 11, 11, 
	11, 11, 11, 11, 11, 11, 11, 11, 
	11, 11, 11, 11, 11, 11, 11, 11, 
	11, 1, 1, 1, 11, 11, 11, 11, 
	11, 11, 11, 11, 11, 11, 11, 11, 
	11, 11, 11, 11, 11, 11, 11, 11, 
	11, 11, 11, 11, 11, 11, 11, 11, 
	11, 11, 11, 11, 11, 1, 13, 1, 
	1, 1, 14, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 13, 15, 16, 
	15, 15, 15, 15, 15, 17, 1, 15, 
	15, 15, 15, 15, 1, 15, 15, 15, 
	15, 15, 15, 15, 15, 15, 15, 1, 
	1, 1, 15, 1, 1, 1, 15, 15, 
	15, 15, 15, 15, 15, 15, 15, 15, 
	15, 15, 15, 15, 15, 15, 15, 15, 
	15, 15, 15, 15, 15, 15, 15, 15, 
	1, 1, 1, 15, 15, 15, 15, 15, 
	15, 15, 15, 15, 15, 15, 15, 15, 
	15, 15, 15, 15, 15, 15, 15, 15, 
	15, 15, 15, 15, 15, 15, 15, 15, 
	15, 15, 15, 15, 1, 18, 1, 1, 
	1, 19, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 18, 1, 20, 1, 
	1, 1, 1, 1, 21, 1, 22, 1, 
	18, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 18, 
	1, 23, 23, 23, 23, 23, 23, 23, 
	23, 23, 1, 23, 23, 24, 23, 23, 
	23, 23, 23, 23, 23, 23, 23, 23, 
	23, 23, 23, 23, 23, 23, 23, 23, 
	23, 23, 25, 23, 23, 23, 23, 23, 
	23, 23, 23, 23, 23, 23, 23, 23, 
	23, 23, 23, 23, 23, 23, 23, 23, 
	23, 23, 23, 23, 23, 23, 23, 23, 
	23, 23, 23, 23, 23, 23, 23, 23, 
	23, 23, 23, 23, 23, 23, 23, 23, 
	23, 23, 23, 23, 23, 23, 23, 23, 
	23, 23, 23, 23, 26, 23, 23, 23, 
	23, 23, 23, 23, 23, 23, 23, 23, 
	23, 23, 23, 23, 23, 23, 23, 23, 
	23, 23, 23, 23, 23, 23, 23, 23, 
	23, 23, 23, 23, 23, 23, 23, 23, 
	1, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 1, 27, 27, 28, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 29, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 30, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	1, 31, 1, 27, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 27, 1, 32, 1, 33, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 33, 1, 34, 
	1, 1, 1, 35, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 34, 7, 
	7, 7, 7, 7, 7, 7, 36, 1, 
	7, 7, 7, 7, 7, 1, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	1, 9, 1, 1, 1, 1, 1, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	7, 1, 1, 1, 7, 7, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	7, 7, 7, 7, 7, 1, 34, 1, 
	1, 1, 35, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 34, 7, 7, 
	7, 7, 7, 7, 7, 36, 1, 7, 
	7, 7, 7, 7, 1, 7, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 1, 
	1, 1, 1, 1, 1, 1, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	1, 1, 1, 7, 7, 7, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	7, 7, 7, 7, 1, 37, 1, 34, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 34, 1, 
	38, 1, 1, 1, 39, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 38, 
	40, 40, 40, 40, 40, 40, 40, 41, 
	1, 40, 40, 40, 40, 40, 1, 40, 
	40, 40, 40, 40, 40, 40, 40, 40, 
	40, 1, 1, 1, 1, 1, 1, 1, 
	40, 40, 40, 40, 40, 40, 40, 40, 
	40, 40, 40, 40, 40, 40, 40, 40, 
	40, 40, 40, 40, 40, 40, 40, 40, 
	40, 40, 1, 1, 1, 40, 40, 40, 
	40, 40, 40, 40, 40, 40, 40, 40, 
	40, 40, 40, 40, 40, 40, 40, 40, 
	40, 40, 40, 40, 40, 40, 40, 40, 
	40, 40, 40, 40, 40, 40, 1, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 1, 
	42, 1, 1, 1, 43, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 42, 
	1, 44, 1, 1, 1, 1, 1, 45, 
	1, 46, 1, 47, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 47, 1, 48, 1, 1, 1, 
	49, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 48, 40, 40, 40, 40, 
	40, 40, 40, 50, 1, 40, 40, 40, 
	40, 40, 1, 40, 40, 40, 40, 40, 
	40, 40, 40, 40, 40, 1, 51, 1, 
	1, 1, 1, 1, 40, 40, 40, 40, 
	40, 40, 40, 40, 40, 40, 40, 40, 
	40, 40, 40, 40, 40, 40, 40, 40, 
	40, 40, 40, 40, 40, 40, 1, 1, 
	1, 40, 40, 40, 40, 40, 40, 40, 
	40, 40, 40, 40, 40, 40, 40, 40, 
	40, 40, 40, 40, 40, 40, 40, 40, 
	40, 40, 40, 40, 40, 40, 40, 40, 
	40, 40, 1, 52, 52, 52, 52, 52, 
	52, 52, 52, 52, 1, 52, 52, 53, 
	52, 52, 52, 52, 52, 52, 52, 52, 
	52, 52, 52, 52, 52, 52, 52, 52, 
	52, 52, 52, 52, 52, 52, 52, 52, 
	52, 52, 54, 55, 52, 52, 52, 52, 
	52, 52, 52, 52, 52, 52, 52, 52, 
	52, 52, 52, 52, 52, 52, 52, 52, 
	52, 52, 52, 52, 52, 52, 52, 52, 
	52, 52, 52, 52, 52, 52, 52, 52, 
	52, 52, 52, 52, 52, 52, 52, 52, 
	52, 52, 52, 52, 52, 52, 56, 52, 
	52, 52, 52, 52, 52, 52, 52, 52, 
	52, 52, 52, 52, 52, 52, 52, 52, 
	52, 52, 52, 52, 52, 52, 52, 52, 
	52, 52, 52, 52, 52, 52, 52, 52, 
	52, 52, 1, 57, 57, 57, 57, 57, 
	57, 57, 57, 57, 1, 57, 57, 58, 
	57, 57, 57, 57, 57, 57, 57, 57, 
	57, 57, 57, 57, 57, 57, 57, 57, 
	57, 57, 57, 57, 57, 57, 57, 57, 
	57, 57, 59, 60, 57, 57, 57, 57, 
	57, 57, 57, 57, 57, 57, 57, 57, 
	57, 57, 57, 57, 57, 57, 57, 57, 
	57, 57, 57, 57, 57, 57, 57, 57, 
	57, 57, 57, 57, 57, 57, 57, 57, 
	57, 57, 57, 57, 57, 57, 57, 57, 
	57, 57, 57, 57, 57, 57, 61, 57, 
	57, 57, 57, 57, 57, 57, 57, 57, 
	57, 57, 57, 57, 57, 57, 57, 57, 
	57, 57, 57, 57, 57, 57, 57, 57, 
	57, 57, 57, 57, 57, 57, 57, 57, 
	57, 57, 1, 62, 1, 57, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 57, 1, 57, 57, 
	57, 57, 57, 57, 57, 57, 57, 57, 
	57, 57, 57, 57, 57, 57, 57, 57, 
	57, 57, 57, 57, 57, 57, 57, 57, 
	57, 57, 57, 57, 57, 57, 57, 57, 
	57, 57, 57, 57, 57, 57, 57, 57, 
	57, 57, 57, 57, 57, 57, 57, 57, 
	57, 57, 57, 57, 57, 57, 57, 57, 
	57, 57, 57, 57, 57, 57, 57, 57, 
	57, 57, 57, 57, 57, 57, 57, 57, 
	57, 57, 57, 57, 57, 57, 57, 57, 
	57, 57, 57, 57, 57, 57, 57, 57, 
	57, 57, 57, 57, 57, 57, 57, 57, 
	57, 57, 57, 57, 57, 57, 57, 57, 
	57, 57, 57, 57, 57, 57, 57, 57, 
	57, 57, 57, 57, 57, 57, 57, 57, 
	57, 57, 57, 57, 57, 57, 1, 63, 
	1, 1, 1, 64, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 63, 65, 
	65, 65, 65, 65, 65, 65, 66, 1, 
	65, 65, 65, 65, 65, 1, 65, 65, 
	65, 65, 65, 65, 65, 65, 65, 65, 
	1, 67, 1, 1, 1, 1, 1, 65, 
	65, 65, 65, 65, 65, 65, 65, 65, 
	65, 65, 65, 65, 65, 65, 65, 65, 
	65, 65, 65, 65, 65, 65, 65, 65, 
	65, 1, 1, 1, 65, 65, 65, 65, 
	65, 65, 65, 65, 65, 65, 65, 65, 
	65, 65, 65, 65, 65, 65, 65, 65, 
	65, 65, 65, 65, 65, 65, 65, 65, 
	65, 65, 65, 65, 65, 1, 68, 1, 
	1, 1, 69, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 68, 1, 1, 
	1, 1, 1, 1, 1, 70, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	71, 1, 68, 1, 1, 1, 69, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 68, 7, 7, 7, 7, 7, 7, 
	7, 70, 1, 7, 7, 7, 7, 7, 
	1, 7, 7, 7, 7, 7, 7, 7, 
	7, 7, 7, 1, 71, 1, 1, 1, 
	1, 1, 7, 7, 7, 7, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	7, 7, 7, 7, 1, 1, 1, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	1, 72, 1, 1, 1, 73, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	72, 40, 40, 40, 40, 40, 40, 40, 
	74, 1, 40, 40, 40, 40, 40, 1, 
	40, 40, 40, 40, 40, 40, 40, 40, 
	40, 40, 1, 75, 1, 1, 1, 1, 
	1, 40, 40, 40, 40, 40, 40, 40, 
	40, 40, 40, 40, 40, 40, 40, 40, 
	40, 40, 40, 40, 40, 40, 40, 40, 
	40, 40, 40, 1, 1, 1, 40, 40, 
	40, 40, 40, 40, 40, 40, 40, 40, 
	40, 40, 40, 40, 40, 40, 40, 40, 
	40, 40, 40, 40, 40, 40, 40, 40, 
	40, 40, 40, 40, 40, 40, 40, 1, 
	76, 1, 1, 1, 77, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 76, 
	78, 1, 78, 78, 78, 78, 78, 79, 
	1, 78, 78, 78, 78, 78, 1, 78, 
	78, 78, 78, 78, 78, 78, 78, 78, 
	78, 1, 71, 1, 78, 1, 1, 1, 
	78, 78, 78, 78, 78, 78, 78, 78, 
	78, 78, 78, 78, 78, 78, 78, 78, 
	78, 78, 78, 78, 78, 78, 78, 78, 
	78, 78, 1, 1, 1, 78, 78, 78, 
	78, 78, 78, 78, 78, 78, 78, 78, 
	78, 78, 78, 78, 78, 78, 78, 78, 
	78, 78, 78, 78, 78, 78, 78, 78, 
	78, 78, 78, 78, 78, 78, 1, 47, 
	1, 1, 1, 80, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 47, 7, 
	7, 7, 7, 7, 7, 7, 81, 1, 
	7, 7, 7, 7, 7, 1, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	1, 9, 1, 1, 1, 1, 1, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	7, 1, 1, 1, 7, 7, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	7, 7, 7, 7, 7, 7, 7, 7, 
	7, 7, 7, 7, 7, 1, 82, 1, 
	1, 1, 83, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 82, 40, 40, 
	40, 40, 40, 40, 40, 84, 1, 40, 
	40, 40, 40, 40, 1, 40, 40, 40, 
	40, 40, 40, 40, 40, 40, 40, 1, 
	51, 1, 1, 1, 1, 1, 40, 40, 
	40, 40, 40, 40, 40, 40, 40, 40, 
	40, 40, 40, 40, 40, 40, 40, 40, 
	40, 40, 40, 40, 40, 40, 40, 40, 
	1, 1, 1, 40, 40, 40, 40, 40, 
	40, 40, 40, 40, 40, 40, 40, 40, 
	40, 40, 40, 40, 40, 40, 40, 40, 
	40, 40, 40, 40, 40, 40, 40, 40, 
	40, 40, 40, 40, 1, 1, 0
]

class << self
	attr_accessor :_content_type_trans_targs
	private :_content_type_trans_targs, :_content_type_trans_targs=
end
self._content_type_trans_targs = [
	2, 0, 2, 3, 33, 4, 5, 7, 
	27, 18, 6, 7, 8, 9, 10, 37, 
	12, 24, 9, 10, 12, 24, 11, 13, 
	14, 34, 23, 13, 14, 34, 23, 15, 
	17, 35, 19, 20, 22, 21, 19, 20, 
	7, 22, 9, 10, 12, 24, 26, 38, 
	4, 5, 27, 18, 29, 30, 29, 40, 
	32, 29, 30, 29, 40, 32, 31, 4, 
	5, 33, 27, 18, 35, 16, 36, 18, 
	35, 16, 36, 18, 38, 25, 37, 39, 
	25, 39, 38, 25, 39
]

class << self
	attr_accessor :_content_type_trans_actions
	private :_content_type_trans_actions, :_content_type_trans_actions=
end
self._content_type_trans_actions = [
	1, 0, 0, 2, 3, 0, 0, 4, 
	5, 0, 0, 0, 6, 7, 7, 7, 
	7, 8, 0, 0, 0, 5, 0, 9, 
	9, 10, 9, 0, 0, 11, 0, 0, 
	0, 0, 0, 0, 5, 0, 12, 12, 
	13, 14, 12, 12, 12, 14, 0, 0, 
	12, 12, 14, 12, 15, 15, 16, 17, 
	15, 0, 0, 5, 18, 0, 0, 19, 
	19, 0, 20, 19, 21, 21, 22, 21, 
	23, 23, 24, 23, 21, 21, 0, 25, 
	0, 5, 12, 12, 14
]

class << self
	attr_accessor :_content_type_eof_actions
	private :_content_type_eof_actions, :_content_type_eof_actions=
end
self._content_type_eof_actions = [
	0, 0, 0, 0, 0, 0, 0, 0, 
	0, 0, 0, 0, 0, 0, 0, 0, 
	0, 0, 0, 0, 0, 0, 0, 0, 
	0, 0, 0, 0, 0, 0, 0, 0, 
	0, 19, 21, 21, 23, 21, 0, 12, 
	0
]

class << self
	attr_accessor :content_type_start
end
self.content_type_start = 1;
class << self
	attr_accessor :content_type_first_final
end
self.content_type_first_final = 33;
class << self
	attr_accessor :content_type_error
end
self.content_type_error = 0;

class << self
	attr_accessor :content_type_en_comment_tail
end
self.content_type_en_comment_tail = 28;
class << self
	attr_accessor :content_type_en_main
end
self.content_type_en_main = 1;


# line 17 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/content_type_machine.rb.rl"

        def self.parse(data)
          p = 0
          eof = data.length
          stack = []

          actions = []
          data_unpacked = data.bytes.to_a
          
# line 513 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/content_type_machine.rb"
begin
	p ||= 0
	pe ||= data.length
	cs = content_type_start
	top = 0
end

# line 26 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/content_type_machine.rb.rl"
          
# line 523 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/content_type_machine.rb"
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
	_inds = _content_type_index_offsets[cs]
	_slen = _content_type_key_spans[cs]
	_trans = if (   _slen > 0 && 
			_content_type_trans_keys[_keys] <= ( data_unpacked[p]) && 
			( data_unpacked[p]) <= _content_type_trans_keys[_keys + 1] 
		    ) then
			_content_type_indicies[ _inds + ( data_unpacked[p]) - _content_type_trans_keys[_keys] ] 
		 else 
			_content_type_indicies[ _inds + _slen ]
		 end
	cs = _content_type_trans_targs[_trans]
	if _content_type_trans_actions[_trans] != 0
	case _content_type_trans_actions[_trans]
	when 12 then
# line 7 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(4, p) 		end
	when 15 then
# line 8 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(5, p) 		end
	when 2 then
# line 25 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(22, p) 		end
	when 1 then
# line 26 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(23, p) 		end
	when 6 then
# line 35 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(32, p) 		end
	when 4 then
# line 36 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(33, p) 		end
	when 21 then
# line 37 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(34, p) 		end
	when 7 then
# line 38 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(35, p) 		end
	when 11 then
# line 41 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(38, p) 		end
	when 9 then
# line 42 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(39, p) 		end
	when 19 then
# line 45 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(42, p) 		end
	when 3 then
# line 46 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(43, p) 		end
	when 5 then
# line 5 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/../../common.rl"
		begin
 	begin
		stack[top] = cs
		top+= 1
		cs = 28
		_goto_level = _again
		next
	end
 		end
	when 18 then
# line 6 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/../../common.rl"
		begin
 	begin
		top -= 1
		cs = stack[top]
		_goto_level = _again
		next
	end
 		end
	when 13 then
# line 7 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(4, p) 		end
# line 36 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(33, p) 		end
	when 23 then
# line 7 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(4, p) 		end
# line 37 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(34, p) 		end
	when 14 then
# line 7 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(4, p) 		end
# line 5 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/../../common.rl"
		begin
 	begin
		stack[top] = cs
		top+= 1
		cs = 28
		_goto_level = _again
		next
	end
 		end
	when 16 then
# line 8 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(5, p) 		end
# line 5 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/../../common.rl"
		begin
 	begin
		stack[top] = cs
		top+= 1
		cs = 28
		_goto_level = _again
		next
	end
 		end
	when 17 then
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
	when 25 then
# line 37 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(34, p) 		end
# line 5 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/../../common.rl"
		begin
 	begin
		stack[top] = cs
		top+= 1
		cs = 28
		_goto_level = _again
		next
	end
 		end
	when 8 then
# line 38 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(35, p) 		end
# line 5 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/../../common.rl"
		begin
 	begin
		stack[top] = cs
		top+= 1
		cs = 28
		_goto_level = _again
		next
	end
 		end
	when 10 then
# line 42 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(39, p) 		end
# line 41 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(38, p) 		end
	when 20 then
# line 45 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(42, p) 		end
# line 5 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/../../common.rl"
		begin
 	begin
		stack[top] = cs
		top+= 1
		cs = 28
		_goto_level = _again
		next
	end
 		end
	when 22 then
# line 5 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/../../common.rl"
		begin
 	begin
		stack[top] = cs
		top+= 1
		cs = 28
		_goto_level = _again
		next
	end
 		end
# line 37 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(34, p) 		end
	when 24 then
# line 7 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(4, p) 		end
# line 5 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/../../common.rl"
		begin
 	begin
		stack[top] = cs
		top+= 1
		cs = 28
		_goto_level = _again
		next
	end
 		end
# line 37 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(34, p) 		end
# line 763 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/content_type_machine.rb"
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
	  case _content_type_eof_actions[cs]
	when 12 then
# line 7 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(4, p) 		end
	when 21 then
# line 37 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(34, p) 		end
	when 19 then
# line 45 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(42, p) 		end
	when 23 then
# line 7 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(4, p) 		end
# line 37 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(34, p) 		end
# line 800 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/content_type_machine.rb"
	  end
	end

	end
	if _goto_level <= _out
		break
	end
end
	end

# line 27 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/content_type_machine.rb.rl"

          if p == eof && cs >= 
# line 814 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/content_type_machine.rb"
33
# line 28 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/content_type_machine.rb.rl"

            return actions, nil
          else
            return [], "Only able to parse up to #{data[0..p]}"
          end
        end
      end
    end
  end
end
