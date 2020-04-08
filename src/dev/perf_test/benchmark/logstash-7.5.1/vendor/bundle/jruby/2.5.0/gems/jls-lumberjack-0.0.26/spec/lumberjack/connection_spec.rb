# encoding: utf-8
require "lumberjack/server"
require "spec_helper"
require "flores/random"

describe "Connnection" do
  let(:server) { double("server", :closed? => false) }
  let(:socket) { double("socket", :closed? => false) }
  let(:connection) { Lumberjack::Connection.new(socket, server) }
  let(:payload) { {"line" => "foobar" } }
  let(:start_sequence) { Flores::Random.integer(0..2000) }
  let(:random_number_of_events) { Flores::Random.integer(2..200) }

  context "when the server is running" do
    before do
      expect(socket).to receive(:sysread).at_least(:once).with(Lumberjack::Connection::READ_SIZE).and_return("")
      allow(socket).to receive(:syswrite).with(anything).and_return(true)
      allow(socket).to receive(:close)


      expectation = receive(:feed)
        .with("")
        .and_yield(:version, Lumberjack::Parser::PROTOCOL_VERSION_1)
        .and_yield(:window_size, random_number_of_events)

      random_number_of_events.times { |n| expectation.and_yield(:data, start_sequence + n + 1, payload) }

      expect_any_instance_of(Lumberjack::Parser).to expectation
    end

    it "should ack the end of a sequence" do
      expect(socket).to receive(:syswrite).with(["1A", random_number_of_events + start_sequence].pack("A*N"))
      connection.read_socket
    end
  end

  context "when the server stop" do
    let(:server) { double("server", :closed? => true) }
    before do
      expect(socket).to receive(:close).and_return(true)
    end

    it "stop reading from the socket" do
      expect { |b| connection.run(&b) }.not_to yield_control
    end
  end
end
