require 'snmp'
include SNMP

host = ARGV[0] || 'localhost'

manager = Manager.new(:Host => host, :Port => 161)
start_oid = ObjectId.new("1.3.6.1.2")
next_oid = start_oid
while next_oid.subtree_of?(start_oid)
  response = manager.get_next(next_oid)
  varbind = response.varbind_list.first
  break if EndOfMibView == varbind.value
  next_oid = varbind.name
  puts "#{varbind.name.to_s}  #{varbind.value.to_s}  #{varbind.value.asn1_type}"
end
