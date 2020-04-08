require 'snmp'

host = ARGV[0] || 'localhost'

SNMP::Manager.open(:Host => "localhost") do |manager|
  manager.walk("ifTable") { |vb| puts vb }
end


SNMP::Manager.open(:Host => host) do |manager|
  manager.walk(["ifIndex", "ifDescr"]) do |ifIndex, ifDescr|
    puts "#{ifIndex} #{ifDescr}"
  end
end
