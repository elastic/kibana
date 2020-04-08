
# line 1 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/content_transfer_encoding_machine.rb.rl"

# line 10 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/content_transfer_encoding_machine.rb.rl"


module Mail
  module Parsers
    module Ragel
      module ContentTransferEncodingMachine
        
# line 13 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/content_transfer_encoding_machine.rb"
class << self
	attr_accessor :_content_transfer_encoding_trans_keys
	private :_content_transfer_encoding_trans_keys, :_content_transfer_encoding_trans_keys=
end
self._content_transfer_encoding_trans_keys = [
	0, 0, 9, 126, 10, 10, 
	9, 32, 10, 10, 9, 
	32, 10, 10, 9, 32, 
	9, 126, 1, 127, 1, 127, 
	10, 10, 9, 32, -128, 
	-1, 9, 126, 9, 59, 
	9, 59, 9, 40, 9, 40, 
	0, 0, 0
]

class << self
	attr_accessor :_content_transfer_encoding_key_spans
	private :_content_transfer_encoding_key_spans, :_content_transfer_encoding_key_spans=
end
self._content_transfer_encoding_key_spans = [
	0, 118, 1, 24, 1, 24, 1, 24, 
	118, 127, 127, 1, 24, 128, 118, 51, 
	51, 32, 32, 0
]

class << self
	attr_accessor :_content_transfer_encoding_index_offsets
	private :_content_transfer_encoding_index_offsets, :_content_transfer_encoding_index_offsets=
end
self._content_transfer_encoding_index_offsets = [
	0, 0, 119, 121, 146, 148, 173, 175, 
	200, 319, 447, 575, 577, 602, 731, 850, 
	902, 954, 987, 1020
]

class << self
	attr_accessor :_content_transfer_encoding_indicies
	private :_content_transfer_encoding_indicies, :_content_transfer_encoding_indicies=
end
self._content_transfer_encoding_indicies = [
	0, 1, 1, 1, 2, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 0, 
	3, 3, 3, 3, 3, 3, 3, 4, 
	1, 3, 3, 3, 3, 3, 1, 3, 
	3, 3, 3, 3, 3, 3, 3, 3, 
	3, 1, 1, 1, 1, 1, 1, 1, 
	3, 3, 3, 3, 3, 3, 3, 3, 
	3, 3, 3, 3, 3, 3, 3, 3, 
	3, 3, 3, 3, 3, 3, 3, 3, 
	3, 3, 1, 1, 1, 3, 3, 3, 
	3, 3, 3, 3, 3, 3, 3, 3, 
	3, 3, 3, 3, 3, 3, 3, 3, 
	3, 3, 3, 3, 3, 3, 3, 3, 
	3, 3, 3, 3, 3, 3, 1, 5, 
	1, 0, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	0, 1, 6, 1, 7, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 7, 1, 8, 1, 9, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 9, 1, 
	10, 1, 1, 1, 11, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 10, 
	12, 12, 12, 12, 12, 12, 12, 13, 
	1, 12, 12, 12, 12, 12, 1, 12, 
	12, 12, 12, 12, 12, 12, 12, 12, 
	12, 1, 1, 1, 1, 1, 1, 1, 
	12, 12, 12, 12, 12, 12, 12, 12, 
	12, 12, 12, 12, 12, 12, 12, 12, 
	12, 12, 12, 12, 12, 12, 12, 12, 
	12, 12, 1, 1, 1, 12, 12, 12, 
	12, 12, 12, 12, 12, 12, 12, 12, 
	12, 12, 12, 12, 12, 12, 12, 12, 
	12, 12, 12, 12, 12, 12, 12, 12, 
	12, 12, 12, 12, 12, 12, 1, 14, 
	14, 14, 14, 14, 14, 14, 14, 14, 
	1, 14, 14, 15, 14, 14, 14, 14, 
	14, 14, 14, 14, 14, 14, 14, 14, 
	14, 14, 14, 14, 14, 14, 14, 14, 
	14, 14, 14, 14, 14, 14, 16, 17, 
	14, 14, 14, 14, 14, 14, 14, 14, 
	14, 14, 14, 14, 14, 14, 14, 14, 
	14, 14, 14, 14, 14, 14, 14, 14, 
	14, 14, 14, 14, 14, 14, 14, 14, 
	14, 14, 14, 14, 14, 14, 14, 14, 
	14, 14, 14, 14, 14, 14, 14, 14, 
	14, 14, 18, 14, 14, 14, 14, 14, 
	14, 14, 14, 14, 14, 14, 14, 14, 
	14, 14, 14, 14, 14, 14, 14, 14, 
	14, 14, 14, 14, 14, 14, 14, 14, 
	14, 14, 14, 14, 14, 14, 1, 19, 
	19, 19, 19, 19, 19, 19, 19, 19, 
	1, 19, 19, 20, 19, 19, 19, 19, 
	19, 19, 19, 19, 19, 19, 19, 19, 
	19, 19, 19, 19, 19, 19, 19, 19, 
	19, 19, 19, 19, 19, 19, 21, 22, 
	19, 19, 19, 19, 19, 19, 19, 19, 
	19, 19, 19, 19, 19, 19, 19, 19, 
	19, 19, 19, 19, 19, 19, 19, 19, 
	19, 19, 19, 19, 19, 19, 19, 19, 
	19, 19, 19, 19, 19, 19, 19, 19, 
	19, 19, 19, 19, 19, 19, 19, 19, 
	19, 19, 23, 19, 19, 19, 19, 19, 
	19, 19, 19, 19, 19, 19, 19, 19, 
	19, 19, 19, 19, 19, 19, 19, 19, 
	19, 19, 19, 19, 19, 19, 19, 19, 
	19, 19, 19, 19, 19, 19, 1, 24, 
	1, 19, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	19, 1, 1, 1, 1, 1, 1, 1, 
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
	1, 1, 19, 25, 1, 1, 1, 26, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 25, 27, 27, 27, 27, 27, 
	27, 27, 28, 1, 27, 27, 27, 27, 
	27, 1, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 1, 29, 1, 1, 
	1, 1, 1, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 1, 1, 1, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 27, 27, 27, 27, 27, 27, 27, 
	27, 1, 7, 1, 1, 1, 30, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 7, 1, 1, 1, 1, 1, 1, 
	1, 31, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 9, 1, 32, 1, 
	1, 1, 33, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 32, 1, 1, 
	1, 1, 1, 1, 1, 34, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	35, 1, 9, 1, 1, 1, 36, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 9, 1, 1, 1, 1, 1, 1, 
	1, 37, 1, 35, 1, 1, 1, 38, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 1, 1, 1, 1, 1, 1, 
	1, 1, 35, 1, 1, 1, 1, 1, 
	1, 1, 39, 1, 1, 0
]

class << self
	attr_accessor :_content_transfer_encoding_trans_targs
	private :_content_transfer_encoding_trans_targs, :_content_transfer_encoding_trans_targs=
end
self._content_transfer_encoding_trans_targs = [
	1, 0, 2, 14, 8, 3, 5, 15, 
	7, 17, 1, 2, 14, 8, 10, 11, 
	10, 19, 13, 10, 11, 10, 19, 13, 
	12, 15, 4, 14, 16, 17, 4, 16, 
	15, 4, 16, 17, 6, 18, 6, 18
]

class << self
	attr_accessor :_content_transfer_encoding_trans_actions
	private :_content_transfer_encoding_trans_actions, :_content_transfer_encoding_trans_actions=
end
self._content_transfer_encoding_trans_actions = [
	0, 0, 0, 1, 2, 0, 0, 0, 
	0, 0, 3, 3, 4, 5, 6, 6, 
	7, 8, 6, 0, 0, 2, 9, 0, 
	0, 10, 10, 0, 11, 10, 0, 2, 
	3, 3, 5, 3, 0, 2, 3, 5
]

class << self
	attr_accessor :_content_transfer_encoding_eof_actions
	private :_content_transfer_encoding_eof_actions, :_content_transfer_encoding_eof_actions=
end
self._content_transfer_encoding_eof_actions = [
	0, 0, 0, 0, 0, 0, 0, 0, 
	0, 0, 0, 0, 0, 0, 10, 0, 
	3, 0, 3, 0
]

class << self
	attr_accessor :content_transfer_encoding_start
end
self.content_transfer_encoding_start = 1;
class << self
	attr_accessor :content_transfer_encoding_first_final
end
self.content_transfer_encoding_first_final = 14;
class << self
	attr_accessor :content_transfer_encoding_error
end
self.content_transfer_encoding_error = 0;

class << self
	attr_accessor :content_transfer_encoding_en_comment_tail
end
self.content_transfer_encoding_en_comment_tail = 9;
class << self
	attr_accessor :content_transfer_encoding_en_main
end
self.content_transfer_encoding_en_main = 1;


# line 17 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/content_transfer_encoding_machine.rb.rl"

        def self.parse(data)
          p = 0
          eof = data.length
          stack = []

          actions = []
          data_unpacked = data.bytes.to_a
          
# line 251 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/content_transfer_encoding_machine.rb"
begin
	p ||= 0
	pe ||= data.length
	cs = content_transfer_encoding_start
	top = 0
end

# line 26 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/content_transfer_encoding_machine.rb.rl"
          
# line 261 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/content_transfer_encoding_machine.rb"
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
	_inds = _content_transfer_encoding_index_offsets[cs]
	_slen = _content_transfer_encoding_key_spans[cs]
	_trans = if (   _slen > 0 && 
			_content_transfer_encoding_trans_keys[_keys] <= ( data_unpacked[p]) && 
			( data_unpacked[p]) <= _content_transfer_encoding_trans_keys[_keys + 1] 
		    ) then
			_content_transfer_encoding_indicies[ _inds + ( data_unpacked[p]) - _content_transfer_encoding_trans_keys[_keys] ] 
		 else 
			_content_transfer_encoding_indicies[ _inds + _slen ]
		 end
	cs = _content_transfer_encoding_trans_targs[_trans]
	if _content_transfer_encoding_trans_actions[_trans] != 0
	case _content_transfer_encoding_trans_actions[_trans]
	when 3 then
# line 7 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(4, p) 		end
	when 6 then
# line 8 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(5, p) 		end
	when 10 then
# line 17 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(14, p) 		end
	when 1 then
# line 18 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(15, p) 		end
	when 2 then
# line 5 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/../../common.rl"
		begin
 	begin
		stack[top] = cs
		top+= 1
		cs = 9
		_goto_level = _again
		next
	end
 		end
	when 9 then
# line 6 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/../../common.rl"
		begin
 	begin
		top -= 1
		cs = stack[top]
		_goto_level = _again
		next
	end
 		end
	when 4 then
# line 7 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(4, p) 		end
# line 18 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(15, p) 		end
	when 5 then
# line 7 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(4, p) 		end
# line 5 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/../../common.rl"
		begin
 	begin
		stack[top] = cs
		top+= 1
		cs = 9
		_goto_level = _again
		next
	end
 		end
	when 7 then
# line 8 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(5, p) 		end
# line 5 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/../../common.rl"
		begin
 	begin
		stack[top] = cs
		top+= 1
		cs = 9
		_goto_level = _again
		next
	end
 		end
	when 8 then
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
	when 11 then
# line 17 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(14, p) 		end
# line 5 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/../../common.rl"
		begin
 	begin
		stack[top] = cs
		top+= 1
		cs = 9
		_goto_level = _again
		next
	end
 		end
# line 396 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/content_transfer_encoding_machine.rb"
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
	  case _content_transfer_encoding_eof_actions[cs]
	when 3 then
# line 7 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(4, p) 		end
	when 10 then
# line 17 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/rb_actions.rl"
		begin
 actions.push(14, p) 		end
# line 422 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/content_transfer_encoding_machine.rb"
	  end
	end

	end
	if _goto_level <= _out
		break
	end
end
	end

# line 27 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/content_transfer_encoding_machine.rb.rl"

          if p == eof && cs >= 
# line 436 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/content_transfer_encoding_machine.rb"
14
# line 28 "/home/bpot/src/gh/bpot/mail/lib/mail/parsers/ragel/ruby/machines/content_transfer_encoding_machine.rb.rl"

            return actions, nil
          else
            return [], "Only able to parse up to #{data[0..p]}"
          end
        end
      end
    end
  end
end
