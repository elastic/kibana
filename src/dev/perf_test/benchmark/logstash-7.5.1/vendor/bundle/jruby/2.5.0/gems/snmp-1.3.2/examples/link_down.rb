require 'rubygems'
require 'snmp'
require 'logger'

log = Logger.new($stdout)

mib = SNMP::MIB.new
mib.load_module("IF-MIB")
linkDown_OID = mib.oid("linkDown")

# 1 is "up" and 2 is "down" in the MIB
ADMIN_UP = 1
ADMIN_DOWN = 2

listener = SNMP::TrapListener.new(:Port => 1062, :Community => 'public') do |listener|
  log.info "Listening for linkDown traps"
  listener.on_trap(linkDown_OID) do |trap|
    vb_list = trap.vb_list
    up_time = vb_list[0].value    # standard varbind - always in v2c trap
    trap_oid = vb_list[1].value   # standard varbind - always in v2c trap

    # extract trap info - order determined by IF-MIB
    ifIndex = vb_list[2].value
    adminStatus = vb_list[3].value
    operStatus = vb_list[4].value

    # log stuff based on interface status
    if adminStatus == ADMIN_DOWN
      log.info "Interface #{ifIndex} turned down"
    else
      log.error "Problem on interface #{ifIndex}!  Link unintentionally down"
    end
  end

  listener.on_trap_v1 do |trap|
    log.warn "Unexpected v1 trap: #{trap.generic_trap}"
  end

  listener.on_trap_v2c do |trap|
    log.warn "Unexpected v2c trap: #{trap.trap_oid}"
  end
end

trap("INT") do
  puts "\nShutting down"
  listener.kill
end

listener.join
