%%{

  machine common;

  action comment_begin { fcall comment_tail; }
  action comment_exit { fret; }

  # RFC5322: address_lists, date_time, message_ids, phrase_lists, received

  obs_NO_WS_CTL = 0x01..0x08 | 0x0b | 0x0c | 0x0e..0x1f | 0x7f;
  LF = "\n";
  CR = "\r";
  CRLF = "\r\n";
  WSP = 0x09 | 0x20;
  obs_ctext = obs_NO_WS_CTL;
  VCHAR = 0x21..0x7e;
  obs_qp = "\\" (0x00 | obs_NO_WS_CTL | LF | CR);
  obs_FWS = (CRLF? WSP)+;
  ctext = 0x21..0x27 | 0x2a..0x5b | 0x5d..0x7e | obs_ctext;
  quoted_pair = ("\\" (VCHAR | WSP)) | obs_qp;
  FWS = (WSP* CRLF WSP+) | (CRLF WSP+) | obs_FWS;
  ALPHA = [a-zA-Z];
  DIGIT = [0-9];
  DQUOTE = '"';
  obs_qtext = obs_NO_WS_CTL;
  atext = ALPHA | DIGIT | "!" | "#" | "$" | "%" | "&" |
          "'" | "*" | "+" | "-" | "/" | "=" | "?" | "^" |
          "_" | "`" | "{" | "|" | "}" | "~";
  qtext = 0x21 | 0x23..0x5b | 0x5d..0x7e | obs_qtext;
  obs_dtext = obs_NO_WS_CTL | quoted_pair;
  qcontent = qtext | quoted_pair;

  # Handle recursive comments
  ccontent = ctext | quoted_pair | "(" @comment_begin;
  comment_tail := ((FWS? ccontent)* >comment_s) FWS? ")" @comment_exit;
  comment = "(" @comment_begin %comment_e;
  CFWS = ((FWS? comment)+ FWS?) | FWS;

  quoted_string = CFWS?
                  (DQUOTE
                    (((FWS? qcontent)* FWS?) >qstr_s %qstr_e)
                  DQUOTE)
                  CFWS?;

  atom = CFWS? atext+ CFWS?;
  word = atom | quoted_string;

  # phrase_lists
  obs_phrase = (word | "." | "@")+;
  phrase = (obs_phrase | word+) >phrase_s %phrase_e;
  phrase_lists = phrase ("," FWS* phrase)*;

  # address_lists

  # local_part:
  domain_text = (DQUOTE (FWS? qcontent)+ FWS? DQUOTE) | atext+;
  local_dot_atom_text = ("."* domain_text "."*)+;
  local_dot_atom = CFWS?
                   (local_dot_atom_text >local_dot_atom_s %local_dot_atom_pre_comment_e)
                   CFWS?;
  obs_local_part = word ("." word)*;
  local_part = (local_dot_atom >local_dot_atom_s %local_dot_atom_e |
                (quoted_string %local_quoted_string_e) |
                obs_local_part);

  # Treetop parser behavior was to ignore addresses missing '@' inside of angle
  # brackets. This construction preserves that behavior.
  local_part_no_capture = (local_dot_atom | quoted_string | obs_local_part);

  # domain:
  dot_atom_text = "."* domain_text ("."* domain_text)*;
  dtext = 0x21..0x5a | 0x5e..0x7e | obs_dtext;
  dot_atom = CFWS? dot_atom_text (CFWS? >(comment_after_address,1));
  domain_literal = CFWS? "[" (FWS? dtext)* FWS? "]" CFWS?;
  obs_domain = atom ("." atom)*;
  domain = (dot_atom | domain_literal | obs_domain) >domain_s %domain_e;

  # addr_spec:

  # The %(end_addr,N) priority resolves uncertainty when whitespace
  # after an addr_spec could cause it to be interpreted as a
  # display name: "bar@example.com ,..."

  addr_spec_in_angle_brackets =
    (local_part "@" domain) %(end_addr,1) |
    local_part_no_capture   %(end_addr,0);

  addr_spec_no_angle_brackets =
    (local_part "@" domain) %(end_addr,1) |
    local_part              %(end_addr,0);

  # angle_addr:
  obs_domain_list = (CFWS | ",")* "@" domain ("," CFWS? ("@" domain)?)*;
  obs_route = (obs_domain_list ":") >obs_domain_list_s %obs_domain_list_e;
  obs_angle_addr = CFWS? "<" obs_route? addr_spec_in_angle_brackets ">" CFWS?;

  angle_addr = CFWS? ("<" >angle_addr_s) addr_spec_in_angle_brackets ">" CFWS? |
                obs_angle_addr;

  # Address
  display_name = phrase;
  name_addr = display_name? %(end_addr,2) angle_addr;
  mailbox = (name_addr | addr_spec_no_angle_brackets) >address_s %address_e;
  obs_mbox_list = (CFWS? ",")* mailbox ("," (mailbox | CFWS)?)*;
  mailbox_list = (mailbox (("," | ";") mailbox)*) | obs_mbox_list;
  obs_group_list = (CFWS? ",")+ CFWS?;
  group_list = mailbox_list | CFWS | obs_group_list;
  group = (display_name >group_name_s %group_name_e) ":"
            (group_list?) ";" CFWS?;
  address = group | mailbox;
  #obs_addr_list = (CFWS? ",")* address ("," (address | CFWS)?)*;
  address_lists = address? %(comment_after_address,0)
                  (FWS* ("," | ";") FWS* address?)*;

  # message_ids
  obs_id_left = local_part;
  id_left = dot_atom_text | obs_id_left;
  # id_right modifications to support multiple '@' in msg_id.
  msg_id_atext = ALPHA | DIGIT | "!" | "#" | "$" | "%" | "&" | "'" | "*" |
                 "+" | "-" | "/" | "=" | "?" | "^" | "_" | "`" | "{" | "|" |
                 "}" | "~" | "@";
  msg_id_dot_atom_text = (msg_id_atext+ "."?)+;
  obs_id_right = domain;
  no_fold_literal = "[" (dtext)* "]";
  id_right = msg_id_dot_atom_text | no_fold_literal | obs_id_right;
  msg_id = (CFWS)?
           (("<" id_left "@" id_right ">") >msg_id_s %msg_id_e)
           (CFWS)?;
  message_ids = msg_id (CFWS? msg_id)*;

  include date_time "date_time.rl";
  date_time = (day_of_week ",")?
              (date >date_s %date_e) <: (time >time_s %time_e) CFWS?;

  # Added CFWS? to increase robustness
  # (qmail likes to include a comment style string...?)
  received_token = word | angle_addr | addr_spec_no_angle_brackets | domain;
  received = ((CFWS? received_token*) >received_tokens_s %received_tokens_e)
              ";" date_time;

  # RFC2045: mime_version, content_type, content_transfer_encoding
  mime_version = CFWS?
            (DIGIT+ >major_digits_s %major_digits_e)
            comment? "." comment?
            (DIGIT+ >minor_digits_s %minor_digits_e)
            CFWS?;

  token = 0x21..0x27 | 0x2a..0x2b | 0x2c..0x2e |
          0x30..0x39 | 0x41..0x5a | 0x5e..0x7e;
  value = (quoted_string | (token -- '"' | 0x3d)+) >param_val_s %param_val_e;
  attribute = (token+) >param_attr_s %param_attr_e;
  parameter = CFWS? attribute "=" value CFWS?;

  ietf_token = token+;
  custom_x_token = 'x'i "-" token+;
  extension_token = ietf_token | custom_x_token;
  discrete_type = 'text'i | 'image'i | 'audio'i | 'video'i |
                  'application'i | extension_token;
  composite_type = 'message'i | 'multipart'i | extension_token;
  iana_token = token+;
  main_type = (discrete_type | composite_type) >main_type_s %main_type_e;
  sub_type = (extension_token | iana_token) >sub_type_s %sub_type_e;
  content_type = main_type "/" sub_type (((CFWS? ";"+) | CFWS) parameter CFWS?)*;

  encoding = ('7bits' | '8bits' | '7bit' | '8bit' | 'binary' |
              'quoted-printable' | 'base64' | ietf_token |
              custom_x_token) >encoding_s %encoding_e;
  content_transfer_encoding = CFWS? encoding CFWS? ";"? CFWS?;

  # RFC2183: content_disposition
  # TODO: recognize filename, size, creation date, etc.
  disposition_type = 'inline'i | 'attachment'i | extension_token | '';
  content_disposition = (disposition_type >disp_type_s %disp_type_e)
                        (CFWS? ";" parameter CFWS?)*;

  # Envelope From
  ctime_date = day_name " "+ month " "+ day " " time_of_day " " year;
  null_sender = ('<>' ' '{0,1});
  envelope_from = (addr_spec_no_angle_brackets | null_sender) >address_s %address_e " "
                  (ctime_date >ctime_date_s %ctime_date_e);

  # content_location
  location = quoted_string | ((token | 0x3d)+ >token_string_s %token_string_e);
  content_location = CFWS? location CFWS?;
}%%
