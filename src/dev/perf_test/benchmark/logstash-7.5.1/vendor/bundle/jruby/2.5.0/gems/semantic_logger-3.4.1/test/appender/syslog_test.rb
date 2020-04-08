require_relative '../test_helper'
require 'net/tcp_client'

# Unit Test for SemanticLogger::Appender::Syslog
#
module Appender
  class SyslogTest < Minitest::Test
    describe SemanticLogger::Appender::Syslog do

      it 'handle local syslog' do
        message = nil
        Syslog.stub(:open, nil) do
          Syslog.stub(:log, -> level, msg { message = msg }) do
            syslog_appender = SemanticLogger::Appender::Syslog.new(level: :debug)
            syslog_appender.debug 'AppenderSyslogTest log message'
          end
        end
        assert_match(/D (.*?) SemanticLogger::Appender::Syslog -- AppenderSyslogTest log message/, message)
      end

      it 'handle remote syslog over TCP' do
        message = nil
        Net::TCPClient.stub_any_instance(:closed?, false) do
          Net::TCPClient.stub_any_instance(:connect, nil) do
            syslog_appender = SemanticLogger::Appender::Syslog.new(server: 'tcp://localhost:88888', level: :debug)
            syslog_appender.remote_syslog.stub(:write, Proc.new { |data| message = data }) do
              syslog_appender.debug 'AppenderSyslogTest log message'
            end
          end
        end
        assert_match(/<70>(.*?)SemanticLogger::Appender::Syslog -- AppenderSyslogTest log message\r\n/, message)
      end

      it 'handle remote syslog over UDP' do
        message         = nil
        syslog_appender = SemanticLogger::Appender::Syslog.new(server: 'udp://localhost:88888', level: :debug)
        UDPSocket.stub_any_instance(:send, -> msg, num, host, port { message = msg }) do
          syslog_appender.debug 'AppenderSyslogTest log message'
        end
        assert_match(/<70>(.*?)SemanticLogger::Appender::Syslog -- AppenderSyslogTest log message/, message)
      end

      # Should be able to log each level.
      SemanticLogger::LEVELS.each do |level|
        it "log #{level} information" do
          Syslog.stub(:open, nil) do
            Syslog.stub(:log, nil) do
              syslog_appender = SemanticLogger::Appender::Syslog.new
              syslog_appender.send(level, 'AppenderSyslogTest #{level.to_s} message')
            end
          end
        end
      end

      it 'allow logging with %' do
        message         = 'AppenderSyslogTest %test'
        syslog_appender = SemanticLogger::Appender::Syslog.new
        syslog_appender.debug(message)
      end

    end
  end
end
