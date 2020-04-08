module Mail
  module Parsers
    module Ragel
      ACTIONS = [
       :addr_spec,
       :address_e,
       :address_s,
       :angle_addr_s,
       :comment_e,
       :comment_s,
       :ctime_date_e,
       :ctime_date_s,
       :date_e,
       :date_s,
       :disp_type_e,
       :disp_type_s,
       :domain_e,
       :domain_s,
       :encoding_e,
       :encoding_s,
       :group_name_e,
       :group_name_s,
       :local_dot_atom_e,
       :local_dot_atom_pre_comment_e,
       :local_dot_atom_s,
       :local_quoted_string_e,
       :main_type_e,
       :main_type_s,
       :major_digits_e,
       :major_digits_s,
       :minor_digits_e,
       :minor_digits_s,
       :msg_id_e,
       :msg_id_s,
       :obs_domain_list_e,
       :obs_domain_list_s,
       :param_attr_e,
       :param_attr_s,
       :param_val_e,
       :param_val_s,
       :phrase_e,
       :phrase_s,
       :qstr_e,
       :qstr_s,
       :received_tokens_e,
       :received_tokens_s,
       :sub_type_e,
       :sub_type_s,
       :time_e,
       :time_s,
       :token_string_e,
       :token_string_s
      ]

      FIELD_PARSERS = %w[ address_lists phrase_lists
                          date_time received message_ids envelope_from
                          mime_version content_type content_disposition
                          content_transfer_encoding content_location ]
    end
  end
end
