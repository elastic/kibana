# encoding: utf-8
require 'spec_helper'
require 'lumberjack/client'
require 'lumberjack/server'
require "socket"
require "thread"
require "openssl"
require "zlib"

describe "Lumberjack::Client" do
  describe "Lumberjack::Socket" do
    let(:port)   { 5000 }

    subject(:socket) { Lumberjack::Socket.new(:port => port, :ssl_certificate => "" ) }

    before do
      allow_any_instance_of(Lumberjack::Socket).to receive(:connection_start).and_return(true)
      # mock any network call
      allow(socket).to receive(:send_window_size).with(kind_of(Integer)).and_return(true)
      allow(socket).to receive(:send_payload).with(kind_of(String)).and_return(true)
    end

    context "sequence" do
     let(:hash)   { {:a => 1, :b => 2}}
     let(:max_unsigned_int) { (2**32)-1 }

      before(:each) do
        allow(socket).to receive(:ack).and_return(true)
      end

      it "force sequence to be an unsigned 32 bits int" do
        socket.instance_variable_set(:@sequence, max_unsigned_int)
        socket.write_sync(hash)
        expect(socket.sequence).to eq(1)
      end
    end
  end

  describe Lumberjack::FrameEncoder do
    it 'should creates frames without truncating accentued characters' do
      content = {
        "message" => "Le Canadien de Montréal est la meilleure équipe au monde!",
        "other" => "éléphant"
      }
      parser = Lumberjack::Parser.new
      parser.feed(Lumberjack::FrameEncoder.to_frame(content, 0)) do |code, sequence, data|
        if code == :data
          expect(data["message"].force_encoding('UTF-8')).to eq(content["message"])
          expect(data["other"].force_encoding('UTF-8')).to eq(content["other"])
        end
      end
    end

    it 'should creates frames without dropping multibytes characters' do
      content = {
        "message" => "国際ホッケー連盟" # International Hockey Federation
      }
      parser = Lumberjack::Parser.new
      parser.feed(Lumberjack::FrameEncoder.to_frame(content, 0)) do |code, sequence, data|
        expect(data["message"].force_encoding('UTF-8')).to eq(content["message"]) if code == :data
      end
    end
  end

  describe Lumberjack::JsonEncoder do
    it 'should create frames from nested hash' do
      content = {
        "number" => 1,
        "string" => "hello world",
        "array" => [1,2,3],
        "sub" => {
          "a" => 1
        }
      }
      parser = Lumberjack::Parser.new
      frame = Lumberjack::JsonEncoder.to_frame(content, 0)
      parser.feed(frame) do |code, sequence, data|
        expect(data).to eq(content) if code == :json
      end
    end

    it 'should creates frames without truncating accentued characters' do
      content = {
        "message" => "Le Canadien de Montréal est la meilleure équipe au monde!",
        "other" => "éléphant"
      }
      parser = Lumberjack::Parser.new
      parser.feed(Lumberjack::JsonEncoder.to_frame(content, 0)) do |code, sequence, data|
        if code == :json
          expect(data["message"]).to eq(content["message"])
          expect(data["other"]).to eq(content["other"])
        end
      end
    end

    it 'should creates frames without dropping multibytes characters' do
      content = {
        "message" => "国際ホッケー連盟" # International Hockey Federation
      }
      parser = Lumberjack::Parser.new
      parser.feed(Lumberjack::JsonEncoder.to_frame(content, 0)) do |code, sequence, data|
        expect(data["message"]).to eq(content["message"]) if code == :json
      end
    end
  end
end
