# encoding: utf-8
require "lumberjack/client"
require "lumberjack/server"
require "flores/random"
require "flores/pki"
require "spec_helper"

Thread.abort_on_exception = true

describe "Server" do
  let(:certificate) { Flores::PKI.generate }
  let(:certificate_file_crt) { "certificate.crt" }
  let(:certificate_file_key) { "certificate.key" }
  let(:port) { Flores::Random.integer(1024..65335) }
  let(:tcp_port) { port + 1 }
  let(:host) { "127.0.0.1" }
  let(:queue) { [] }

  before do
    expect(File).to receive(:read).at_least(1).with(certificate_file_crt) { certificate.first.to_s }
    expect(File).to receive(:read).at_least(1).with(certificate_file_key) { certificate.last.to_s }
  end

  subject do
    Lumberjack::Server.new(:port => port,
                           :address => host,
                           :ssl_certificate => certificate_file_crt,
                           :ssl_key => certificate_file_key)
  end

  it "should not block when closing the server" do
    thread = Thread.new do
      subject.run do |event|
        queue << event
      end
    end

    sleep(1) while thread.status != "run"
    subject.close
    wait_for { thread.status }.to be_falsey
  end
end
