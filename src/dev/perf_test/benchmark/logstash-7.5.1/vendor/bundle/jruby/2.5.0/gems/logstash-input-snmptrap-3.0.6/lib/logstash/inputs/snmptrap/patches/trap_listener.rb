require "snmp"

# Patch SNMP::TrapListener#process_traps to ignore exceptions when stopping.
class SNMP::TrapListener
  alias_method :original_exit, :exit
  def exit
    @stop = true
    original_exit
  end

  def stop?
    @stop
  end

  alias_method :original_process_traps, :process_traps
  def process_traps(*args)
    original_process_traps(*args)
  rescue
    raise unless stop?
  end
end

