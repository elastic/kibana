require 'snmp'
include SNMP

host = ARGV[0] || 'localhost'

manager = Manager.new(:Host => host, :Port => 161)
varbind = VarBind.new("1.3.6.1.2.1.1.5.0", OctetString.new("System Name"))
manager.set(varbind)
