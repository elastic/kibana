= SNMP Library for Ruby
{<img src="https://travis-ci.com/hallidave/ruby-snmp.svg?branch=master" alt="Build Status" />}[https://travis-ci.com/hallidave/ruby-snmp]
{<img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License MIT" />}[https://raw.githubusercontent.com/hallidave/ruby-snmp/master/MIT-LICENSE]
{<img src="https://badge.fury.io/rb/snmp.svg" alt="Gem Version" />}[https://badge.fury.io/rb/snmp]

== Summary

This library implements SNMP (the Simple Network Management Protocol).  It is
implemented in pure Ruby, so there are no dependencies on external libraries
like net-snmp[http://www.net-snmp.org/].  You can run this library anywhere
that Ruby can run.

This release supports the following:

* The GetRequest, GetNextRequest, GetBulkRequest, SetRequest, Response
  SNMPv1_Trap, SNMPv2_Trap, and Inform PDUs
* All of the ASN.1 data types defined by SNMPv1 and SNMPv2c
* Sending informs and v1 and v2 traps
* Trap handling for informs and v1 and v2 traps
* Symbolic OID values (ie. "ifTable" instead of "1.3.6.1.2.1.2.2") as   
  parameters to the SNMP::Manager API
* Includes symbol data files for all current IETF MIBs
* Compatible with Ruby 1.9 and higher

See the SNMP::Manager, SNMP::TrapListener, and SNMP::MIB classes and the
examples below for more details.

== Installation

You can use RubyGems[http://rubygems.org/] to
install the latest version of the SNMP library.

  gem install snmp

== Examples

=== Get Request

Retrieve a system description.

  require 'snmp'
  
  SNMP::Manager.open(:host => 'localhost') do |manager|
      response = manager.get(["sysDescr.0", "sysName.0"])
      response.each_varbind do |vb|
          puts "#{vb.name.to_s}  #{vb.value.to_s}  #{vb.value.asn1_type}"
      end
  end

=== Set Request

Create a varbind for setting the system name.

  require 'snmp'
  include SNMP

  manager = Manager.new(:host => 'localhost')
  varbind = VarBind.new("1.3.6.1.2.1.1.5.0", OctetString.new("My System Name"))
  manager.set(varbind)
  manager.close

=== Table Walk

Walk the ifTable.

  require 'snmp'

  ifTable_columns = ["ifIndex", "ifDescr", "ifInOctets", "ifOutOctets"]
  SNMP::Manager.open(:host => 'localhost') do |manager|
      manager.walk(ifTable_columns) do |row|
          row.each { |vb| print "\t#{vb.value}" }
          puts
      end
  end

=== Get-Next Request

A more difficult way to walk the ifTable.
 
  require 'snmp'
  include SNMP

  Manager.open(:host => 'localhost') do |manager|
      ifTable = ObjectId.new("1.3.6.1.2.1.2.2")
      next_oid = ifTable
      while next_oid.subtree_of?(ifTable)
          response = manager.get_next(next_oid)
          varbind = response.varbind_list.first
          next_oid = varbind.name
          puts varbind.to_s
      end
  end

=== Get-Bulk Request

Get interface description and admin status for 10 rows of the ifTable.

  require 'snmp'
  include SNMP

  ifDescr_OID = ObjectId.new("1.3.6.1.2.1.2.2.1.2")
  ifAdminStatus_OID = ObjectId.new("1.3.6.1.2.1.2.2.1.7")
  MAX_ROWS = 10
  Manager.open(:host => 'localhost') do |manager|
      response = manager.get_bulk(0, MAX_ROWS, [ifDescr_OID, ifAdminStatus_OID])
      list = response.varbind_list
      until list.empty?
          ifDescr = list.shift
          ifAdminStatus = list.shift
          puts "#{ifDescr.value}    #{ifAdminStatus.value}"
      end
  end

=== Trap Handling

Log traps to STDOUT.

  require 'snmp'
  require 'logger'

  log = Logger.new(STDOUT)
  m = SNMP::TrapListener.new do |manager|
      manager.on_trap_default do |trap|
          log.info trap.inspect
      end
  end
  m.join

== Changes

Changes for version 1.3.2:
* Accept non-standard error status codes

Changes for version 1.3.1:
* Cleaned up deprecation warnings
* Fixed SNMP::Integer#<=> method for Ruby 2.3.0 and later
* Removed artificial limit on number of non-repeaters for GetBulkRequest
* SNMP::BER module no longer pollutes global namespace

Changes for version 1.2.0:
* Removed support for Ruby 1.8
* Changed license to MIT License

Changes for version 1.1.1:

* Incorporate various small pull requests

Changes for version 1.1.0:

* Added MIB support to ObjectId and Varbind, so that to_s can return symbolic information
* Added to_str method to ObjectId to return a numeric OID string (old to_s behavior)
* TrapListener can now support multiple community strings

Changes for version 1.0.4:

* New option handling and added lower-case versions of all options
* Added SNMP::VERSION constant
* Experimental support for IPv6
* Removed support for installation with setup.rb

Changes for version 1.0.3:

* Minor changes to Manager class.  The :Transport option may now be an
  object or a class.  Explicity call Timeout.timeout so that a timeout
  method may be defined in subclasses.  Thanks to Eric Monti.

Changes for version 1.0.2:

* Internal code changes to make this library compatible with both Ruby 1.8
  and Ruby 1.9.  Note that an ord() method is now added to the Fixnum class
  for Ruby 1.8.  See the ber.rb file for details.

Changes for version 1.0.1:

* Made the host configurable for the TrapListener.  Previously defaulted
  to 'localhost'.

Changes for version 1.0.0:

* Added to_s method to TimeTicks.  Displays time in human-readable form
  instead of just a number.  The to_i method can still be used to get the
  number of ticks.

== License

This SNMP Library is released under the MIT License.

Copyright (c) 2004-2014 David R. Halliday

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
