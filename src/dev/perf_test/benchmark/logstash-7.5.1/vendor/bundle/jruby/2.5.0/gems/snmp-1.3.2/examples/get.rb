require 'snmp'

host = ARGV[0] || 'localhost'

manager = SNMP::Manager.new(:Host => host, :Port => 161)
response = manager.get(["sysDescr.0", "sysName.0"])
response.each_varbind { |vb| puts vb.to_s }
