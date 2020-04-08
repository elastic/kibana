require_relative "spec_helper"
require 'logger'

describe "caller_logging extension" do
  before do
    @db = Sequel.mock(:extensions=>[:caller_logging])
    @log_stream = StringIO.new
    @db.loggers << Logger.new(@log_stream)
    @ds = @db[:items]
  end

  exec_sql_line = __LINE__ + 2
  def exec_sql(sql)
    @db[sql].all
  end

  it "should log caller information, skipping internal Sequel code" do
    exec_sql("SELECT * FROM items")
    @log_stream.rewind
    lines = @log_stream.read.split("\n")
    lines.length.must_equal 1
    lines[0].must_match(/ \(source: #{__FILE__}:#{exec_sql_line}:in `exec_sql'\) SELECT \* FROM items\z/)
  end

  it "should allow formatting of caller information" do
    @db.caller_logging_formatter = lambda{|line| line.sub(/\A.+(caller_logging_spec\.rb:\d+).+\z/, '\1:')}
    exec_sql("SELECT * FROM items")
    @log_stream.rewind
    lines = @log_stream.read.split("\n")
    lines.length.must_equal 1
    lines[0].must_match(/ caller_logging_spec\.rb:#{exec_sql_line}: SELECT \* FROM items\z/)
  end

  it "should allow ignoring additional caller lines in application" do
    @db.caller_logging_ignore = /exec_sql/
    exec_sql("SELECT * FROM items"); line = __LINE__
    @log_stream.rewind
    lines = @log_stream.read.split("\n")
    lines.length.must_equal 1
    lines[0].must_match(/ \(source: #{__FILE__}:#{line}:in `block.+\) SELECT \* FROM items\z/)
  end

  it "should not log caller information if all callers lines are filtered" do
    @db.caller_logging_ignore = /./
    exec_sql("SELECT * FROM items"); line = __LINE__
    @log_stream.rewind
    lines = @log_stream.read.split("\n")
    lines.length.must_equal 1
    lines[0].must_match(/ SELECT \* FROM items\z/)
    lines[0].wont_match(/ source: #{__FILE__}/)
  end
end
