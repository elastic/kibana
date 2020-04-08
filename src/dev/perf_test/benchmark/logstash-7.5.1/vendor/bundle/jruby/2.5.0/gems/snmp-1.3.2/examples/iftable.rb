require 'snmp'
include SNMP

host = ARGV[0] || 'localhost'

manager = Manager.new(:Host => host, :Port => 161)
ifTable = ObjectId.new("1.3.6.1.2.1.2.2")
next_oid = ifTable
while next_oid.subtree_of?(ifTable)
  response = manager.get_next(next_oid)
  varbind = response.varbind_list.first
  next_oid = varbind.name
  puts "#{varbind.name.to_s}  #{varbind.value.to_s}  #{varbind.value.asn1_type}"
end
