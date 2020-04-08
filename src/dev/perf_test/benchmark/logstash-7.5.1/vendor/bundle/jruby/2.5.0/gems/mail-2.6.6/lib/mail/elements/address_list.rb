# encoding: utf-8
# frozen_string_literal: true
module Mail
  class AddressList # :nodoc:

    # Mail::AddressList is the class that parses To, From and other address fields from
    # emails passed into Mail.
    # 
    # AddressList provides a way to query the groups and mailbox lists of the passed in
    # string.
    # 
    # It can supply all addresses in an array, or return each address as an address object.
    # 
    # Mail::AddressList requires a correctly formatted group or mailbox list per RFC2822 or
    # RFC822.  It also handles all obsolete versions in those RFCs.
    # 
    #  list = 'ada@test.lindsaar.net, My Group: mikel@test.lindsaar.net, Bob <bob@test.lindsaar.net>;'
    #  a = AddressList.new(list)
    #  a.addresses    #=> [#<Mail::Address:14943130 Address: |ada@test.lindsaar.net...
    #  a.group_names  #=> ["My Group"]
    def initialize(string)
      @addresses_grouped_by_group = nil
      @address_list = Mail::Parsers::AddressListsParser.new.parse(string)
    end
    
    # Returns a list of address objects from the parsed line
    def addresses
      @addresses ||= @address_list.addresses.map do |address_data|
        Mail::Address.new(address_data)
      end
    end

    def addresses_grouped_by_group
      addresses.select(&:group).group_by(&:group)
    end
    
    # Returns the names as an array of strings of all groups
    def group_names # :nodoc:
      @address_list.group_names
    end
  end
end
