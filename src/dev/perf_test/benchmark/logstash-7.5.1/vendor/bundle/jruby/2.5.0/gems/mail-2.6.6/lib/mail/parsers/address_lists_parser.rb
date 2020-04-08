# frozen_string_literal: true
module Mail::Parsers
  class AddressListsParser
    include Mail::Utilities

    def parse(s)
      address_list = AddressListStruct.new([],[])

      if Mail::Utilities.blank?(s)
        return address_list
      end

      actions, error = Ragel.parse(:address_lists, s)
      if error
        raise Mail::Field::ParseError.new(Mail::AddressList, s, error)
      end


      phrase_s = phrase_e = qstr_s = qstr = comment_s = nil
      group_name_s = domain_s = group_name = nil
      local_dot_atom_s = local_dot_atom_e = nil
      local_dot_atom_pre_comment_e = nil
      obs_domain_list_s = nil

      address_s = 0
      address = AddressStruct.new(nil, nil, [], nil, nil, nil, nil)
      actions.each_slice(2) do |action_id, p|
        action = Mail::Parsers::Ragel::ACTIONS[action_id]
        case action

        # Phrase
        when :phrase_s then phrase_s = p
        when :phrase_e then phrase_e = p-1

        # Quoted String.
        when :qstr_s then qstr_s = p
        when :qstr_e then qstr = s[qstr_s..(p-1)]

        # Comment
        when :comment_s
          comment_s = p unless comment_s
        when :comment_e
          if address
            address.comments << s[comment_s..(p-2)]
          end
          comment_s = nil

        # Group Name
        when :group_name_s then group_name_s = p
        when :group_name_e
          if qstr
            group = qstr
            qstr = nil
          else
            group = s[group_name_s..(p-1)]
            group_name_s = nil
          end
          address_list.group_names << group
          group_name = group

          # Start next address
          address = AddressStruct.new(nil, nil, [], nil, nil, nil, nil)
          address_s = p
          address.group = group_name

        # Address
        when :address_s
          address_s = p
        when :address_e
          # Ignore address end events if they don't have
          # a matching address start event.
          next if address_s.nil?
          if address.local.nil? && local_dot_atom_pre_comment_e && local_dot_atom_s && local_dot_atom_e
            if address.domain
              address.local = s[local_dot_atom_s..local_dot_atom_e] if address
            else
              address.local = s[local_dot_atom_s..local_dot_atom_pre_comment_e] if address
            end
          end
          address.raw = s[address_s..(p-1)]
          address_list.addresses << address if address

          # Start next address
          address = AddressStruct.new(nil, nil, [], nil, nil, nil, nil)
          address.group = group_name
          address_s = nil

        # Don't set the display name until the
        # address has actually started. This allows
        # us to choose quoted_s version if it
        # exists and always use the 'full' phrase
        # version.
        when :angle_addr_s
          if qstr
            address.display_name = Mail::Utilities.unescape(qstr)
            qstr = nil
          elsif phrase_e
            address.display_name = s[phrase_s..phrase_e].strip
            phrase_e = phrase_s = nil
          end

        # Domain
        when :domain_s
          domain_s = p
        when :domain_e
          address.domain = s[domain_s..(p-1)].rstrip if address

        # Local
        when :local_dot_atom_s then local_dot_atom_s = p
        when :local_dot_atom_e then local_dot_atom_e = p-1
        when :local_dot_atom_pre_comment_e
          local_dot_atom_pre_comment_e = p-1
        when :local_quoted_string_e
          address.local = '"' + qstr + '"' if address

        # obs_domain_list
        when :obs_domain_list_s then obs_domain_list_s = p
        when :obs_domain_list_e
          address.obs_domain_list = s[obs_domain_list_s..(p-1)]

        else
          raise Mail::Field::ParseError.new(Mail::AddressList, s, "Failed to process unknown action: #{action}")
        end
      end

      if address_list.addresses.empty? && address_list.group_names.empty?
        raise Mail::Field::ParseError.new(Mail::AddressList, s, "Didn't find any addresses or groups")
      end

      address_list
    end
  end
end
