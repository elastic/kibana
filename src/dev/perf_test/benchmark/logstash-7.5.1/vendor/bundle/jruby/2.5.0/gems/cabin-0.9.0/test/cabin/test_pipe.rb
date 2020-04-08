require "test_helper"

describe Cabin::Channel do
  class Receiver
    attr_accessor :data

    public
    def initialize
      @data = []
    end

    def <<(data)
      @data << data
    end
  end # class Receiver

  before do
    @logger = Cabin::Channel.new
    @target = Receiver.new
    @logger.subscribe(@target)

    @info_reader,  @info_writer  = IO.pipe
    @error_reader, @error_writer = IO.pipe
  end

  after do
    @logger.unsubscribe(@target.object_id)
    [ @info_reader, @info_writer,
      @error_reader, @error_writer ].each do |io|
      io.close unless io.closed?
    end
  end

  test 'Piping one IO' do
    @info_writer.puts 'Hello world'
    @info_writer.close

    @logger.pipe(@info_reader => :info)
    assert_equal(1, @target.data.length)
    assert_equal('Hello world', @target.data[0][:message])
  end

  test 'Piping multiple IOs' do
    @info_writer.puts 'Hello world'
    @info_writer.close

    @error_writer.puts 'Goodbye world'
    @error_writer.close

    @logger.pipe(@info_reader => :info, @error_reader => :error)
    assert_equal(2, @target.data.length)
    assert_equal('Hello world',   @target.data[0][:message])
    assert_equal(:info,           @target.data[0][:level])
    assert_equal('Goodbye world', @target.data[1][:message])
    assert_equal(:error,          @target.data[1][:level])
  end

  test 'Piping with a block' do
    @info_writer.puts 'Hello world'
    @info_writer.close

    @error_writer.puts 'Goodbye world'
    @error_writer.close

    info  = StringIO.new
    error = StringIO.new

    @logger.pipe(@info_reader => :info, @error_reader => :error) do |message, level|
      info  << message if level == :info
      error << message if level == :error
    end

    assert_equal('Hello world',   info.string)
    assert_equal('Goodbye world', error.string)
  end
end

