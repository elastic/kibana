%%{
  machine content_type;

  include rb_actions "rb_actions.rl";
  include common "../../common.rl";

  getkey data_unpacked[p];

  main := content_type;
}%%

module Mail
  module Parsers
    module Ragel
      module ContentTypeMachine
        %%write data;

        def self.parse(data)
          p = 0
          eof = data.length
          stack = []

          actions = []
          data_unpacked = data.bytes.to_a
          %%write init;
          %%write exec;

          if p == eof && cs >= %%{ write first_final; }%%
            return actions, nil
          else
            return [], "Only able to parse up to #{data[0..p]}"
          end
        end
      end
    end
  end
end
