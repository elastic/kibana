# encoding: utf-8
require "logstash/inputs/base"
require "logstash/namespace"

require "snmp"
require_relative "snmptrap/patches/trap_listener"

# Read snmp trap messages as events
#
# Resulting `@message` looks like :
# [source,ruby]
#   #<SNMP::SNMPv1_Trap:0x6f1a7a4 @varbind_list=[#<SNMP::VarBind:0x2d7bcd8f @value="teststring",
#   @name=[1.11.12.13.14.15]>], @timestamp=#<SNMP::TimeTicks:0x1af47e9d @value=55>, @generic_trap=6,
#   @enterprise=[1.2.3.4.5.6], @source_ip="127.0.0.1", @agent_addr=#<SNMP::IpAddress:0x29a4833e @value="\xC0\xC1\xC2\xC3">,
#   @specific_trap=99>
#

class LogStash::Inputs::Snmptrap < LogStash::Inputs::Base
  config_name "snmptrap"

  # The address to listen on
  config :host, :validate => :string, :default => "0.0.0.0"

  # The port to listen on. Remember that ports less than 1024 (privileged
  # ports) may require root to use. hence the default of 1062.
  config :port, :validate => :number, :default => 1062

  # SNMP Community String to listen for.
  config :community, :validate => :array, :default => "public"

  # directory of YAML MIB maps  (same format ruby-snmp uses)
  config :yamlmibdir, :validate => :string

  def initialize(*args)
    super(*args)
  end # def initialize

  def register
    @snmptrap = nil
    if @yamlmibdir
      @logger.info("checking #{@yamlmibdir} for MIBs")
      Dir["#{@yamlmibdir}/*.yaml"].each do |yamlfile|
        mib_name = File.basename(yamlfile, ".*")
        @yaml_mibs ||= []
        @yaml_mibs << mib_name
      end
      @logger.info("found MIBs: #{@yaml_mibs.join(',')}") if @yaml_mibs
    end
  end # def register

  def run(output_queue)
    begin
      # snmp trap server
      snmptrap_listener(output_queue)
    rescue => e
      @logger.warn("SNMP Trap listener died", :exception => e, :backtrace => e.backtrace)
      Stud.stoppable_sleep(5) { stop? }
      retry if !stop?
    end # begin
  end # def run

  def stop
    @snmptrap.exit unless @snmptrap.nil?
    @snmptrap = nil
  end

  private

  def build_trap_listener
    traplistener_opts = {:Port => @port, :Community => @community, :Host => @host}
    if @yaml_mibs && !@yaml_mibs.empty?
      traplistener_opts.merge!({:MibDir => @yamlmibdir, :MibModules => @yaml_mibs})
    end
    @logger.info("It's a Trap!", traplistener_opts.dup)
    @snmptrap = SNMP::TrapListener.new(traplistener_opts)
  end

  def snmptrap_listener(output_queue)
    build_trap_listener

    @snmptrap.on_trap_default do |trap|
      begin
        event = LogStash::Event.new("message" => trap.inspect, "host" => trap.source_ip)
        decorate(event)
        trap.each_varbind do |vb|
          event.set(vb.name.to_s, vb.value.to_s)
        end
        @logger.debug("SNMP Trap received: ", :trap_object => trap.inspect)
        output_queue << event
      rescue => event
        @logger.error("Failed to create event", :trap_object => trap.inspect)
      end
    end
    @snmptrap.join
  end # def snmptrap_listener

end # class LogStash::Inputs::Snmptrap
