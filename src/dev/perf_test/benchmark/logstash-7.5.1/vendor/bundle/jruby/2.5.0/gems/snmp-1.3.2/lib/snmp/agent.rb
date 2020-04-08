# frozen_string_literal: true
#
# Copyright (c) 2004-2014 David R. Halliday
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.
#

require 'snmp'
require 'socket'
require 'logger'

module SNMP

  class Agent #:nodoc:all

    def initialize(listen_port=161, max_packet=8000)
      @log = Logger.new(STDOUT)
      @log.level = Logger::DEBUG
      @max_packet = max_packet
      @socket = UDPSocket.open
      @socket.bind(nil, listen_port)
      @mib = MIB::SystemMIB.new
    end

    def start
      @log.info "SNMP agent running"
      loop do
        begin
          data, remote_info = @socket.recvfrom(@max_packet)
          puts "Received #{data.length} bytes"
          p data
          message = Message.decode(data)
          case message.pdu
          when GetRequest
            response = message.response
            response.pdu.varbind_list.each do |v|
              v.value = @mib.get(v.name)
            end
          when SetRequest
            response = message.response
          else
            raise "invalid message #{message.to_s}"
          end
          puts "Responding to #{remote_info[3]}:#{remote_info[1]}"
          encoded_message = response.encode
          n=@socket.send(encoded_message, 0, remote_info[3], remote_info[1])
          p encoded_message
        rescue => e
          @log.error e
          shutdown
        end
      end
    end

    def shutdown
      @log.info "SNMP agent stopping"
      @socket.close
      exit
    end

    alias stop :shutdown

  end

end

if $0 == __FILE__
  agent = SNMP::Agent.new(1061)
  trap("INT") { agent.shutdown }
  agent.start
end
