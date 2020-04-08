
# line 1 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/phrase_lists_machine.rb.rl"

# line 10 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/phrase_lists_machine.rb.rl"


module Mail
  module Parsers
    module Ragel
      module PhraseListsMachine
        
# line 13 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/phrase_lists_machine.rb"
class << self
	attr_accessor :_phrase_lists_trans_keys
	private :_phrase_lists_trans_keys, :_phrase_lists_trans_keys=
end
self._phrase_lists_trans_keys = [
	0, 0, 9, 126, 9, 126, 
	10, 10, 9, 32, 10, 
	10, 9, 32, 1, 127, 
	1, 127, 10, 10, 9, 32, 
	-128, -1, 9, 126, 10, 
	10, 9, 32, 9, 126, 
	1, 127, 1, 127, 10, 10, 
	9, 32, -128, -1, 9, 
	126, 9, 126, 9, 126, 
	0, 0, 0
]

class << self
	attr_accessor :_phrase_lists_key_spans
	private :_phrase_lists_key_spans, :_phrase_lists_key_spans=
end
self._phrase_lists_key_spans = [
	0, 118, 118, 1, 24, 1, 24, 127, 
	127, 1, 24, 128, 118, 1, 24, 118, 
	127, 127, 1, 24, 128, 118, 118, 118, 
	0
]

class << self
	attr_accessor :_phrase_lists_index_offsets
	private :_phrase_lists_index_offsets, :_phrase_lists_index_offsets=
end
self._phrase_lists_index_offsets = [
	0, 0, 119, 238, 240, 265, 267, 292, 
	420, 548, 550, 575, 704, 823, 825, 850, 
	969, 1097, 1225, 1227, 1252, 1381, 1500, 1619, 
	1738
]

class << self
	attr_accessor :_phrase_lists_indicies
	private :_phrase_lists_indicies, :_phrase_lists_indicies=
end
self._phrase_lists_indicies = [
	0, 1, 1, 1, 2, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 0, 
	3, 4, 3, 3, 3, 3, 3, 5, 
	1, 3, 3, 1, 3, 6, 3, 3, 
	3, 3, 3, 3, 3, 3, 3, 3, 
	3, 1, 1, 1, 3, 1, 3, 6, 
	3, 3, 3, 3, 3, 3, 3, 3, 
	3, 3, 3, 3, 3, 3, 3, 3, 
	3, 3, 3, 3, 3, 3, 3, 3, 
	3, 3, 1, 1, 1, 3, 3, 3, 
	3, 3, 3, 3, 3, 3, 3, 3, 
	3, 3, 3, 3, 3, 3, 3, 3, 
	3, 3, 3, 3, 3, 3, 3, 3, 
	3, 3, 3, 3, 3, 3, 1, 7, 
	1, 1, 1, 8, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 7, 9, 
	10, 9, 9, 9, 9, 9, 11, 1, 
	9, 9, 1, 9, 1, 9, 9, 9, 
	9, 9, 9, 9, 9, 9, 9, 9, 
	1, 1, 1, 9, 1, 9, 1, 9, 
	9, 9, 9, 9, 9, 9, 9, 9, 
	9, 9, 9, 9, 9, 9, 9, 9, 
	9, 9, 9, 9, 9, 9, 9, 9, 
	9, 1, 1, 1, 9, 9, 9, 9, 
	9, 9, 9, 9, 9, 9, 9, 9, 
	9, 9, 9, 9, 9, 9, 9, 9, 
	9, 9, 9, 9, 9, 9, 9, 9, 
	9, 9, 9, 9, 9, 1, 12, 1, 
	7, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 7, 
	1, 13, 1, 9, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 9, 1, 14, 14, 14, 14, 
	14, 14, 14, 14, 14, 1, 14, 14, 
	15, 14, 14, 14, 14, 14, 14, 14, 
	14, 14, 14, 14, 14, 14, 14, 14, 
	14, 14, 14, 14, 14, 16, 14, 14, 
	14, 14, 14, 14, 14, 14, 14, 14, 
	14, 14, 14, 14, 14, 14, 14, 14, 
	14, 14, 14, 14, 14, 14, 14, 14, 
	14, 14, 14, 14, 14, 14, 14, 14, 
	14, 14, 14, 14, 14, 14, 14, 14, 
	14, 14, 14, 14, 14, 14, 14, 14, 
	14, 14, 14, 14, 14, 14, 14, 17, 
	14, 14, 14, 14, 14, 14, 14, 14, 
	14, 14, 14, 14, 14, 14, 14, 14, 
	14, 14, 14, 14, 14, 14, 14, 14, 
	14, 14, 14, 14, 14, 14, 14, 14, 
	14, 14, 14, 1, 18, 18, 18, 18, 
	18, 18, 18, 18, 18, 1, 18, 18, 
	19, 18, 18, 18, 18, 18, 18, 18, 
	18, 18, 18, 18, 18, 18, 18, 18, 
	18, 18, 18, 18, 18, 20, 18, 18, 
	18, 18, 18, 18, 18, 18, 18, 18, 
	18, 18, 18, 18, 18, 18, 18, 18, 
	18, 18, 18, 18, 18, 18, 18, 18, 
	18, 18, 18, 18, 18, 18, 18, 18, 
	18, 18, 18, 18, 18, 18, 18, 18, 
	18, 18, 18, 18, 18, 18, 18, 18, 
	18, 18, 18, 18, 18, 18, 18, 21, 
	18, 18, 18, 18, 18, 18, 18, 18, 
	18, 18, 18, 18, 18, 18, 18, 18, 
	18, 18, 18, 18, 18, 18, 18, 18, 
	18, 18, 18, 18, 18, 18, 18, 18, 
	18, 18, 18, 1, 22, 1, 18, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 18, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 18, 
	23, 1, 1, 1, 24, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 23, 
	3, 4, 3, 3, 3, 3, 3, 5, 
	1, 3, 3, 1, 3, 6, 3, 3, 
	3, 3, 3, 3, 3, 3, 3, 3, 
	3, 1, 1, 1, 3, 1, 3, 6, 
	3, 3, 3, 3, 3, 3, 3, 3, 
	3, 3, 3, 3, 3, 3, 3, 3, 
	3, 3, 3, 3, 3, 3, 3, 3, 
	3, 3, 1, 1, 1, 3, 3, 3, 
	3, 3, 3, 3, 3, 3, 3, 3, 
	3, 3, 3, 3, 3, 3, 3, 3, 
	3, 3, 3, 3, 3, 3, 3, 3, 
	3, 3, 3, 3, 3, 3, 1, 25, 
	1, 26, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	26, 1, 27, 1, 1, 1, 28, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 27, 29, 30, 29, 29, 29, 29, 
	29, 31, 1, 29, 29, 1, 29, 1, 
	29, 29, 29, 29, 29, 29, 29, 29, 
	29, 29, 29, 1, 1, 1, 29, 1, 
	29, 1, 29, 29, 29, 29, 29, 29, 
	29, 29, 29, 29, 29, 29, 29, 29, 
	29, 29, 29, 29, 29, 29, 29, 29, 
	29, 29, 29, 29, 1, 1, 1, 29, 
	29, 29, 29, 29, 29, 29, 29, 29, 
	29, 29, 29, 29, 29, 29, 29, 29, 
	29, 29, 29, 29, 29, 29, 29, 29, 
	29, 29, 29, 29, 29, 29, 29, 29, 
	1, 32, 32, 32, 32, 32, 32, 32, 
	32, 32, 1, 32, 32, 33, 32, 32, 
	32, 32, 32, 32, 32, 32, 32, 32, 
	32, 32, 32, 32, 32, 32, 32, 32, 
	32, 32, 32, 32, 32, 32, 32, 32, 
	34, 35, 32, 32, 32, 32, 32, 32, 
	32, 32, 32, 32, 32, 32, 32, 32, 
	32, 32, 32, 32, 32, 32, 32, 32, 
	32, 32, 32, 32, 32, 32, 32, 32, 
	32, 32, 32, 32, 32, 32, 32, 32, 
	32, 32, 32, 32, 32, 32, 32, 32, 
	32, 32, 32, 32, 36, 32, 32, 32, 
	32, 32, 32, 32, 32, 32, 32, 32, 
	32, 32, 32, 32, 32, 32, 32, 32, 
	32, 32, 32, 32, 32, 32, 32, 32, 
	32, 32, 32, 32, 32, 32, 32, 32, 
	1, 37, 37, 37, 37, 37, 37, 37, 
	37, 37, 1, 37, 37, 38, 37, 37, 
	37, 37, 37, 37, 37, 37, 37, 37, 
	37, 37, 37, 37, 37, 37, 37, 37, 
	37, 37, 37, 37, 37, 37, 37, 37, 
	39, 40, 37, 37, 37, 37, 37, 37, 
	37, 37, 37, 37, 37, 37, 37, 37, 
	37, 37, 37, 37, 37, 37, 37, 37, 
	37, 37, 37, 37, 37, 37, 37, 37, 
	37, 37, 37, 37, 37, 37, 37, 37, 
	37, 37, 37, 37, 37, 37, 37, 37, 
	37, 37, 37, 37, 41, 37, 37, 37, 
	37, 37, 37, 37, 37, 37, 37, 37, 
	37, 37, 37, 37, 37, 37, 37, 37, 
	37, 37, 37, 37, 37, 37, 37, 37, 
	37, 37, 37, 37, 37, 37, 37, 37, 
	1, 42, 1, 37, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 37, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 37, 9, 1, 1, 
	1, 43, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 9, 9, 10, 9, 
	9, 9, 9, 9, 44, 1, 9, 9, 
	45, 9, 46, 9, 9, 9, 9, 9, 
	9, 9, 9, 9, 9, 9, 1, 1, 
	1, 9, 1, 9, 46, 9, 9, 9, 
	9, 9, 9, 9, 9, 9, 9, 9, 
	9, 9, 9, 9, 9, 9, 9, 9, 
	9, 9, 9, 9, 9, 9, 9, 1, 
	1, 1, 9, 9, 9, 9, 9, 9, 
	9, 9, 9, 9, 9, 9, 9, 9, 
	9, 9, 9, 9, 9, 9, 9, 9, 
	9, 9, 9, 9, 9, 9, 9, 9, 
	9, 9, 9, 1, 29, 1, 1, 1, 
	47, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 29, 29, 30, 29, 29, 
	29, 29, 29, 48, 1, 29, 29, 49, 
	29, 50, 29, 29, 29, 29, 29, 29, 
	29, 29, 29, 29, 29, 1, 1, 1, 
	29, 1, 29, 50, 29, 29, 29, 29, 
	29, 29, 29, 29, 29, 29, 29, 29, 
	29, 29, 29, 29, 29, 29, 29, 29, 
	29, 29, 29, 29, 29, 29, 1, 1, 
	1, 29, 29, 29, 29, 29, 29, 29, 
	29, 29, 29, 29, 29, 29, 29, 29, 
	29, 29, 29, 29, 29, 29, 29, 29, 
	29, 29, 29, 29, 29, 29, 29, 29, 
	29, 29, 1, 7, 1, 1, 1, 8, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 7, 9, 10, 9, 9, 9, 
	9, 9, 11, 1, 9, 9, 45, 9, 
	46, 9, 9, 9, 9, 9, 9, 9, 
	9, 9, 9, 9, 1, 1, 1, 9, 
	1, 9, 46, 9, 9, 9, 9, 9, 
	9, 9, 9, 9, 9, 9, 9, 9, 
	9, 9, 9, 9, 9, 9, 9, 9, 
	9, 9, 9, 9, 9, 1, 1, 1, 
	9, 9, 9, 9, 9, 9, 9, 9, 
	9, 9, 9, 9, 9, 9, 9, 9, 
	9, 9, 9, 9, 9, 9, 9, 9, 
	9, 9, 9, 9, 9, 9, 9, 9, 
	9, 1, 1, 0
]

class << self
	attr_accessor :_phrase_lists_trans_targs
	private :_phrase_lists_trans_targs, :_phrase_lists_trans_targs=
end
self._phrase_lists_trans_targs = [
	2, 0, 3, 21, 7, 15, 23, 2, 
	3, 21, 7, 15, 4, 6, 8, 9, 
	21, 11, 8, 9, 21, 11, 10, 12, 
	13, 14, 12, 2, 3, 21, 7, 15, 
	17, 18, 17, 24, 20, 17, 18, 17, 
	24, 20, 19, 5, 22, 12, 23, 5, 
	22, 12, 23
]

class << self
	attr_accessor :_phrase_lists_trans_actions
	private :_phrase_lists_trans_actions, :_phrase_lists_trans_actions=
end
self._phrase_lists_trans_actions = [
	1, 0, 1, 1, 1, 2, 1, 0, 
	0, 0, 0, 3, 0, 0, 4, 4, 
	5, 4, 0, 0, 6, 0, 0, 1, 
	1, 0, 0, 7, 7, 7, 7, 8, 
	9, 9, 10, 11, 9, 0, 0, 3, 
	12, 0, 0, 0, 3, 13, 0, 7, 
	8, 14, 7
]

class << self
	attr_accessor :_phrase_lists_eof_actions
	private :_phrase_lists_eof_actions, :_phrase_lists_eof_actions=
end
self._phrase_lists_eof_actions = [
	0, 0, 0, 0, 0, 0, 0, 0, 
	0, 0, 0, 0, 0, 0, 0, 0, 
	0, 0, 0, 0, 0, 13, 14, 13, 
	0
]

class << self
	attr_accessor :phrase_lists_start
end
self.phrase_lists_start = 1;
class << self
	attr_accessor :phrase_lists_first_final
end
self.phrase_lists_first_final = 21;
class << self
	attr_accessor :phrase_lists_error
end
self.phrase_lists_error = 0;

class << self
	attr_accessor :phrase_lists_en_comment_tail
end
self.phrase_lists_en_comment_tail = 16;
class << self
	attr_accessor :phrase_lists_en_main
end
self.phrase_lists_en_main = 1;


# line 17 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/phrase_lists_machine.rb.rl"

        def self.parse(data)
          p = 0
          eof = data.length
          stack = []

          actions = []
          data_unpacked = data.bytes.to_a
          
# line 350 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/phrase_lists_machine.rb"
begin
	p ||= 0
	pe ||= data.length
	cs = phrase_lists_start
	top = 0
end

# line 26 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/phrase_lists_machine.rb.rl"
          
# line 360 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/phrase_lists_machine.rb"
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
	_inds = _phrase_lists_index_offsets[cs]
	_slen = _phrase_lists_key_spans[cs]
	_trans = if (   _slen > 0 && 
			_phrase_lists_trans_keys[_keys] <= ( data_unpacked[p]) && 
			( data_unpacked[p]) <= _phrase_lists_trans_keys[_keys + 1] 
		    ) then
			_phrase_lists_indicies[ _inds + ( data_unpacked[p]) - _phrase_lists_trans_keys[_keys] ] 
		 else 
			_phrase_lists_indicies[ _inds + _slen ]
		 end
	cs = _phrase_lists_trans_targs[_trans]
	if _phrase_lists_trans_actions[_trans] != 0
	case _phrase_lists_trans_actions[_trans]
	when 7 then
# line 7 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(4, p) 		end
	when 9 then
# line 8 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(5, p) 		end
	when 13 then
# line 39 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(36, p) 		end
	when 1 then
# line 40 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(37, p) 		end
	when 6 then
# line 41 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(38, p) 		end
	when 4 then
# line 42 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(39, p) 		end
	when 3 then
# line 5 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/../../common.rl"
		begin
 	begin
		stack[top] = cs
		top+= 1
		cs = 16
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
	when 14 then
# line 7 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(4, p) 		end
# line 39 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(36, p) 		end
	when 8 then
# line 7 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(4, p) 		end
# line 5 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/../../common.rl"
		begin
 	begin
		stack[top] = cs
		top+= 1
		cs = 16
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
		cs = 16
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
	when 2 then
# line 40 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(37, p) 		end
# line 5 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/../../common.rl"
		begin
 	begin
		stack[top] = cs
		top+= 1
		cs = 16
		_goto_level = _again
		next
	end
 		end
	when 5 then
# line 42 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(39, p) 		end
# line 41 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(38, p) 		end
# line 510 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/phrase_lists_machine.rb"
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
	  case _phrase_lists_eof_actions[cs]
	when 13 then
# line 39 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(36, p) 		end
	when 14 then
# line 7 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(4, p) 		end
# line 39 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(36, p) 		end
# line 539 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/phrase_lists_machine.rb"
	  end
	end

	end
	if _goto_level <= _out
		break
	end
end
	end

# line 27 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/phrase_lists_machine.rb.rl"

          if p == eof && cs >= 
# line 553 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/phrase_lists_machine.rb"
21
# line 28 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/phrase_lists_machine.rb.rl"

            return actions, nil
          else
            return [], "Only able to parse up to #{data[0..p]}"
          end
        end
      end
    end
  end
end
