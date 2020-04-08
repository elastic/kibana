require 'snmp'
require 'logger'

def format_v1_trap(trap)
  "Trap #{trap.generic_trap} from #{trap.source_ip}"
end

def format_v2c_trap(trap)
  "Trap #{trap.trap_oid} from #{trap.source_ip}"
end

log = Logger.new(STDOUT)
m = SNMP::TrapManager.new(:Port => 1062) do |manager|
  manager.on_trap_v1 do |trap|
    log.info format_v1_trap(trap)
  end
  manager.on_trap_v2c do |trap|
    log.info format_v2c_trap(trap)
  end
  log.info "Logging started"
end
trap("INT") { log.info "Logging stopped"; m.exit }
m.join
