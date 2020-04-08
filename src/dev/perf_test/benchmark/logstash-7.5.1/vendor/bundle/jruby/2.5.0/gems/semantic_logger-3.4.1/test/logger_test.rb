require_relative 'test_helper'

# Unit Test for SemanticLogger::Logger
class LoggerTest < Minitest::Test
  describe SemanticLogger::Logger do
    describe '.add_appender' do
      before do
        @appender = nil
      end

      after do
        SemanticLogger.remove_appender(@appender)
        File.delete('sample.log') if File.exist?('sample.log')
      end

      it 'adds file appender' do
        @appender = SemanticLogger.add_appender(file_name: 'sample.log')
        assert @appender.is_a?(SemanticLogger::Appender::File)
        assert SemanticLogger.appenders.include?(@appender)
        assert @appender.formatter.is_a?(SemanticLogger::Formatters::Default)
      end

      it 'adds file appender with json format' do
        @appender = SemanticLogger.add_appender(file_name: 'sample.log', formatter: :json)
        assert @appender.is_a?(SemanticLogger::Appender::File)
        assert SemanticLogger.appenders.include?(@appender)
        assert @appender.formatter.is_a?(SemanticLogger::Formatters::Json)
      end

      it 'adds stream appender' do
        @appender = SemanticLogger.add_appender(io: STDOUT)
        assert @appender.is_a?(SemanticLogger::Appender::File)
        assert SemanticLogger.appenders.include?(@appender)
      end

      it 'adds symbol appender' do
        @appender = SemanticLogger.add_appender(appender: :wrapper, logger: Logger.new(STDOUT))
        assert @appender.is_a?(SemanticLogger::Appender::Wrapper), -> { @appender.ai }
        assert SemanticLogger.appenders.include?(@appender)
      end

      it 'adds symbol appender with underscores' do
        @appender = SemanticLogger.add_appender(appender: :new_relic)
        assert @appender.is_a?(SemanticLogger::Appender::NewRelic), -> { @appender.ai }
        assert SemanticLogger.appenders.include?(@appender)
      end

      it 'adds logger wrapper appender' do
        @appender = SemanticLogger.add_appender(logger: ::Logger.new(STDOUT))
        assert @appender.is_a?(SemanticLogger::Appender::Wrapper)
        assert @appender.logger.is_a?(::Logger)
        assert SemanticLogger.appenders.include?(@appender)
        assert @appender.formatter.is_a?(SemanticLogger::Formatters::Default)
      end

      it 'adds logger wrapper appender with color formatter' do
        @appender = SemanticLogger.add_appender(logger: ::Logger.new(STDOUT), formatter: :color)
        assert @appender.is_a?(SemanticLogger::Appender::Wrapper)
        assert @appender.logger.is_a?(::Logger)
        assert SemanticLogger.appenders.include?(@appender)
        assert @appender.formatter.is_a?(SemanticLogger::Formatters::Color)
      end

      it 'adds appender' do
        @appender = SemanticLogger.add_appender(appender: SemanticLogger::Appender::File.new(io: STDOUT))
        assert @appender.is_a?(SemanticLogger::Appender::File), @appender.ai
        assert SemanticLogger.appenders.include?(@appender)
      end

      it 'fails to add invalid logger appender' do
        assert_raises do
          SemanticLogger.add_appender(logger: 'blah')
        end
      end
    end

    describe '.add_appender DEPRECATED' do
      after do
        SemanticLogger.remove_appender(@appender) if @appender
        File.delete('sample.log') if File.exist?('sample.log')
      end

      it 'adds file appender' do
        @appender = SemanticLogger.add_appender('sample.log')
        assert @appender.is_a?(SemanticLogger::Appender::File)
        assert SemanticLogger.appenders.include?(@appender)
      end

      it 'adds stream appender' do
        @appender = SemanticLogger.add_appender(STDOUT)
        assert @appender.is_a?(SemanticLogger::Appender::File)
        assert SemanticLogger.appenders.include?(@appender)
      end

      it 'adds appender' do
        @appender = SemanticLogger.add_appender(SemanticLogger::Appender::File.new(io: STDOUT))
        assert @appender.is_a?(SemanticLogger::Appender::File), @appender.ai
        assert SemanticLogger.appenders.include?(@appender)
      end

      it 'adds logger wrapper appender' do
        @appender = SemanticLogger.add_appender(::Logger.new(STDOUT))
        assert @appender.is_a?(SemanticLogger::Appender::Wrapper)
        assert @appender.logger.is_a?(::Logger)
        assert SemanticLogger.appenders.include?(@appender)
      end

      it 'fails to add invalid logger appender' do
        assert_raises do
          SemanticLogger.add_appender(logger: 'blah')
        end
      end
    end

    # Test each filter
    [nil, /\ALogger/, Proc.new { |l| (/\AExclude/ =~ l.message).nil? }].each do |filter|
      describe "filter: #{filter.class.name}" do
        before do
          # Use a mock logger that just keeps the last logged entry in an instance
          # variable
          SemanticLogger.default_level   = :trace
          SemanticLogger.backtrace_level = nil
          @mock_logger                   = MockLogger.new
          @appender                      = SemanticLogger.add_appender(logger: @mock_logger)
          @appender.filter               = filter

          # Add mock metric subscriber
          $last_metric                   = nil
          SemanticLogger.on_metric do |log|
            $last_metric = log.dup
          end

          # Use this test's class name as the application name in the log output
          @logger            = SemanticLogger[LoggerTest]
          @hash              = {session_id: 'HSSKLEU@JDK767', tracking_number: 12345}
          @hash_str          = @hash.inspect.sub("{", "\\{").sub("}", "\\}")
          @thread_name       = Thread.current.name
          @file_name_reg_exp = ' logger_test.rb:\d+'

          assert_equal [], @logger.tags
          assert_equal 65535, SemanticLogger.backtrace_level_index
        end

        after do
          SemanticLogger.remove_appender(@appender)
        end

        # Ensure that any log level can be logged
        SemanticLogger::LEVELS.each do |level|
          level_char = level.to_s.upcase[0]

          describe level do
            it 'logs' do
              @logger.send(level, 'hello world', @hash) { 'Calculations' }
              SemanticLogger.flush
              assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ #{level_char} \[\d+:#{@thread_name}\] LoggerTest -- hello world -- Calculations -- #{@hash_str}/, @mock_logger.message)
            end

            it 'exclude log messages using Proc filter' do
              if filter.is_a?(Proc)
                @logger.send(level, 'Exclude this log message', @hash) { 'Calculations' }
                SemanticLogger.flush
                assert_nil @mock_logger.message
              end
            end

            it 'exclude log messages using RegExp filter' do
              if filter.is_a?(Regexp)
                logger = SemanticLogger::Logger.new('NotLogger', :trace, filter)
                logger.send(level, 'Ignore all log messages from this class', @hash) { 'Calculations' }
                SemanticLogger.flush
                assert_nil @mock_logger.message
              end
            end

            it 'logs with backtrace' do
              SemanticLogger.stub(:backtrace_level_index, 0) do
                @logger.send(level, 'hello world', @hash) { 'Calculations' }
                SemanticLogger.flush
                assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ #{level_char} \[\d+:#{@thread_name}#{@file_name_reg_exp}\] LoggerTest -- hello world -- Calculations -- #{@hash_str}/, @mock_logger.message)
              end
            end

            it 'logs with backtrace and exception' do
              SemanticLogger.stub(:backtrace_level_index, 0) do
                exc = RuntimeError.new('Test')
                @logger.send(level, 'hello world', exc)
                SemanticLogger.flush
                assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ #{level_char} \[\d+:#{@thread_name}#{@file_name_reg_exp}\] LoggerTest -- hello world -- Exception: RuntimeError: Test/, @mock_logger.message)
              end
            end

            it 'logs payload' do
              hash     = {tracking_number: '123456', even: 2, more: 'data'}
              hash_str = hash.inspect.sub('{', '\{').sub('}', '\}')
              @logger.send(level, 'Hello world', hash)
              SemanticLogger.flush
              assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ #{level_char} \[\d+:#{@thread_name}\] LoggerTest -- Hello world -- #{hash_str}/, @mock_logger.message)
            end

            it 'does not log an empty payload' do
              hash = {}
              @logger.send(level, 'Hello world', hash)
              SemanticLogger.flush
              assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ #{level_char} \[\d+:#{@thread_name}\] LoggerTest -- Hello world/, @mock_logger.message)
            end

            describe 'hash only argument' do
              it 'logs message' do
                @logger.send(level, message: 'Hello world')
                SemanticLogger.flush
                assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ #{level_char} \[\d+:#{@thread_name}\] LoggerTest -- Hello world/, @mock_logger.message)
              end

              it 'logs payload and message' do
                @logger.send(level, message: 'Hello world', tracking_number: '123456', even: 2, more: 'data')
                hash = {tracking_number: '123456', even: 2, more: 'data'}
                SemanticLogger.flush
                hash_str = hash.inspect.sub('{', '\{').sub('}', '\}')
                assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ #{level_char} \[\d+:#{@thread_name}\] LoggerTest -- Hello world -- #{hash_str}/, @mock_logger.message)
              end

              it 'logs payload and message from block' do
                @logger.send(level) { {message: 'Hello world', tracking_number: '123456', even: 2, more: 'data'} }
                hash = {tracking_number: '123456', even: 2, more: 'data'}
                SemanticLogger.flush
                hash_str = hash.inspect.sub('{', '\{').sub('}', '\}')
                assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ #{level_char} \[\d+:#{@thread_name}\] LoggerTest -- Hello world -- #{hash_str}/, @mock_logger.message)
              end

              it 'logs payload only' do
                hash = {tracking_number: '123456', even: 2, more: 'data'}
                @logger.send(level, hash)
                SemanticLogger.flush
                hash_str = hash.inspect.sub('{', '\{').sub('}', '\}')
                assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ #{level_char} \[\d+:#{@thread_name}\] LoggerTest -- #{hash_str}/, @mock_logger.message)
              end

              it 'logs duration' do
                @logger.send(level, duration: 123.45, message: 'Hello world', tracking_number: '123456', even: 2, more: 'data')
                hash = {tracking_number: '123456', even: 2, more: 'data'}
                SemanticLogger.flush
                hash_str       = hash.inspect.sub('{', '\{').sub('}', '\}')
                duration_match = defined?(JRuby) ? '\(123ms\)' : '\(123\.5ms\)'
                assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ #{level_char} \[\d+:#{@thread_name}\] #{duration_match} LoggerTest -- Hello world -- #{hash_str}/, @mock_logger.message)
              end

              it 'does not log when below min_duration' do
                @logger.send(level, min_duration: 200, duration: 123.45, message: 'Hello world', tracking_number: '123456', even: 2, more: 'data')
                SemanticLogger.flush
                assert_nil @mock_logger.message
              end

              it 'logs metric' do
                metric_name = '/my/custom/metric'
                @logger.send(level, metric: metric_name, duration: 123.45, message: 'Hello world', tracking_number: '123456', even: 2, more: 'data')
                hash = {tracking_number: '123456', even: 2, more: 'data'}
                SemanticLogger.flush
                hash_str       = hash.inspect.sub('{', '\{').sub('}', '\}')
                duration_match = defined?(JRuby) ? '\(123ms\)' : '\(123\.5ms\)'
                assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ #{level_char} \[\d+:#{@thread_name}\] #{duration_match} LoggerTest -- Hello world -- #{hash_str}/, @mock_logger.message)
                assert metric_name, $last_metric.metric
              end

            end

          end
        end

        describe '#tagged' do
          it 'add tags to log entries' do
            @logger.tagged('12345', 'DJHSFK') do
              @logger.info('Hello world')
              SemanticLogger.flush
              assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ I \[\d+:#{@thread_name}\] \[12345\] \[DJHSFK\] LoggerTest -- Hello world/, @mock_logger.message)
            end
          end

          it 'add embedded tags to log entries' do
            @logger.tagged('First Level', 'tags') do
              @logger.tagged('Second Level') do
                @logger.info('Hello world')
                SemanticLogger.flush
                assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ I \[\d+:#{@thread_name}\] \[First Level\] \[tags\] \[Second Level\] LoggerTest -- Hello world/, @mock_logger.message)
              end
              assert_equal 2, @logger.tags.count, @logger.tags
              assert_equal 'First Level', @logger.tags.first
              assert_equal 'tags', @logger.tags.last
            end
          end
        end

        describe '#with_payload' do
          it 'logs tagged payload' do
            hash     = {tracking_number: '123456', even: 2, more: 'data'}
            hash_str = hash.inspect.sub("{", "\\{").sub("}", "\\}")
            @logger.with_payload(tracking_number: '123456') do
              @logger.with_payload(even: 2, more: 'data') do
                @logger.info('Hello world')
                SemanticLogger.flush
                assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ I \[\d+:#{@thread_name}\] LoggerTest -- Hello world -- #{hash_str}/, @mock_logger.message)
              end
            end
          end
        end

        describe '#fast_tag' do
          it 'add string tag to log entries' do
            @logger.fast_tag('12345') do
              @logger.info('Hello world')
              SemanticLogger.flush
              assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ I \[\d+:#{@thread_name}\] \[12345\] LoggerTest -- Hello world/, @mock_logger.message)
            end
          end
        end

        describe 'Ruby Logger level' do
          # Ensure that any log level can be logged
          Logger::Severity.constants.each do |level|
            it "log Ruby logger #{level} info" do
              @logger.level = Logger::Severity.const_get(level)
              if level.to_s == 'UNKNOWN'
                assert_equal Logger::Severity.const_get('ERROR')+1, @logger.send(:level_index)
              else
                assert_equal Logger::Severity.const_get(level)+1, @logger.send(:level_index)
              end
            end
          end
        end

        describe 'measure' do
          # Ensure that any log level can be measured and logged
          SemanticLogger::LEVELS.each do |level|
            level_char = level.to_s.upcase[0]

            describe 'direct method' do
              it "log #{level} info" do
                assert_equal 'result', @logger.send("measure_#{level}".to_sym, 'hello world') { 'result' } # Measure duration of the supplied block
                SemanticLogger.flush
                assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ #{level_char} \[\d+:#{@thread_name}\] \((\d+\.\d+)|(\d+)ms\) LoggerTest -- hello world/, @mock_logger.message)
              end

              it "log #{level} info with payload" do
                assert_equal 'result', @logger.send("measure_#{level}".to_sym, 'hello world', payload: @hash) { 'result' } # Measure duration of the supplied block
                SemanticLogger.flush
                assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ #{level_char} \[\d+:#{@thread_name}\] \((\d+\.\d+)|(\d+)ms\) LoggerTest -- hello world -- #{@hash_str}/, @mock_logger.message)
              end

              it "not log #{level} info when block is faster than :min_duration" do
                assert_equal 'result', @logger.send("measure_#{level}".to_sym, 'hello world', min_duration: 500) { 'result' } # Measure duration of the supplied block
                SemanticLogger.flush
                assert_nil @mock_logger.message
              end

              it "log #{level} info when block duration exceeds :min_duration" do
                assert_equal 'result', @logger.send("measure_#{level}".to_sym, 'hello world', min_duration: 200, payload: @hash) { sleep 0.5; 'result' } # Measure duration of the supplied block
                SemanticLogger.flush
                assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ #{level_char} \[\d+:#{@thread_name}\] \((\d+\.\d+)|(\d+)ms\) LoggerTest -- hello world -- #{@hash_str}/, @mock_logger.message)
              end

              it "log #{level} info with an exception" do
                assert_raises RuntimeError do
                  @logger.send("measure_#{level}", 'hello world', payload: @hash) { raise RuntimeError.new('Test') } # Measure duration of the supplied block
                end
                SemanticLogger.flush
                assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ #{level_char} \[\d+:#{@thread_name}#{@file_name_reg_exp}\] \((\d+\.\d+)|(\d+)ms\) LoggerTest -- hello world -- Exception: RuntimeError: Test -- #{@hash_str}/, @mock_logger.message)
              end

              it "change log #{level} info with an exception" do
                assert_raises RuntimeError do
                  @logger.send("measure_#{level}", 'hello world', payload: @hash, on_exception_level: :fatal) { raise RuntimeError.new('Test') } # Measure duration of the supplied block
                end
                SemanticLogger.flush
                assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ F \[\d+:#{@thread_name}#{@file_name_reg_exp}\] \((\d+\.\d+)|(\d+)ms\) LoggerTest -- hello world -- Exception: RuntimeError: Test -- #{@hash_str}/, @mock_logger.message)
              end

              it "log #{level} info with metric" do
                metric_name = '/my/custom/metric'
                assert_equal 'result', @logger.send("measure_#{level}".to_sym, 'hello world', metric: metric_name) { 'result' } # Measure duration of the supplied block
                SemanticLogger.flush
                assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ #{level_char} \[\d+:#{@thread_name}\] \((\d+\.\d+)|(\d+)ms\) LoggerTest -- hello world/, @mock_logger.message)
                assert metric_name, $last_metric.metric
              end

              it "log #{level} info with backtrace" do
                SemanticLogger.stub(:backtrace_level_index, 0) do
                  assert_equal 'result', @logger.send("measure_#{level}".to_sym, 'hello world') { 'result' }
                  SemanticLogger.flush
                  assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ #{level_char} \[\d+:#{@thread_name}#{@file_name_reg_exp}\] \((\d+\.\d+)|(\d+)ms\) LoggerTest -- hello world/, @mock_logger.message)
                end
              end
            end

            describe 'generic method' do
              it "log #{level} info" do
                assert_equal 'result', @logger.measure(level, 'hello world') { 'result' } # Measure duration of the supplied block
                SemanticLogger.flush
                assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ #{level_char} \[\d+:#{@thread_name}\] \((\d+\.\d+)|(\d+)ms\) LoggerTest -- hello world/, @mock_logger.message)
              end

              it "log #{level} info with payload" do
                assert_equal 'result', @logger.measure(level, 'hello world', payload: @hash) { 'result' } # Measure duration of the supplied block
                SemanticLogger.flush
                assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ #{level_char} \[\d+:#{@thread_name}\] \((\d+\.\d+)|(\d+)ms\) LoggerTest -- hello world -- #{@hash_str}/, @mock_logger.message)
              end

              it "not log #{level} info when block is faster than :min_duration" do
                assert_equal 'result', @logger.measure(level, 'hello world', min_duration: 500) { 'result' } # Measure duration of the supplied block
                SemanticLogger.flush
                assert_nil @mock_logger.message
              end

              it "log #{level} info when block duration exceeds :min_duration" do
                assert_equal 'result', @logger.measure(level, 'hello world', min_duration: 200, payload: @hash) { sleep 0.5; 'result' } # Measure duration of the supplied block
                SemanticLogger.flush
                assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ #{level_char} \[\d+:#{@thread_name}\] \((\d+\.\d+)|(\d+)ms\) LoggerTest -- hello world -- #{@hash_str}/, @mock_logger.message)
              end

              it "log #{level} info with an exception" do
                assert_raises RuntimeError do
                  @logger.measure(level, 'hello world', payload: @hash) { raise RuntimeError.new('Test') } # Measure duration of the supplied block
                end
                SemanticLogger.flush
                assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ #{level_char} \[\d+:#{@thread_name}#{@file_name_reg_exp}\] \((\d+\.\d+)|(\d+)ms\) LoggerTest -- hello world -- Exception: RuntimeError: Test -- #{@hash_str}/, @mock_logger.message)
              end

              it "log #{level} info with metric" do
                metric_name = '/my/custom/metric'
                assert_equal 'result', @logger.measure(level, 'hello world', metric: metric_name) { 'result' } # Measure duration of the supplied block
                SemanticLogger.flush
                assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ #{level_char} \[\d+:#{@thread_name}\] \((\d+\.\d+)|(\d+)ms\) LoggerTest -- hello world/, @mock_logger.message)
                assert metric_name, $last_metric.metric
              end

              it "log #{level} info with backtrace" do
                SemanticLogger.stub(:backtrace_level_index, 0) do
                  assert_equal 'result', @logger.measure(level, 'hello world') { 'result' }
                  SemanticLogger.flush
                  assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ #{level_char} \[\d+:#{@thread_name}#{@file_name_reg_exp}\] \((\d+\.\d+)|(\d+)ms\) LoggerTest -- hello world/, @mock_logger.message)
                end
              end
            end
          end

          it 'log when the block performs a return' do
            assert_equal 'Good', function_with_return(@logger)
            SemanticLogger.flush
            assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ I \[\d+:#{@thread_name}\] \((\d+\.\d+)|(\d+)ms\) LoggerTest -- hello world -- #{@hash_str}/, @mock_logger.message)
          end

          it 'not log at a level below the silence level' do
            SemanticLogger.default_level = :info
            @logger.measure_info('hello world', silence: :error) do
              @logger.warn "don't log me"
            end
            SemanticLogger.flush
            assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ I \[\d+:#{@thread_name}\] \((\d+\.\d+)|(\d+)ms\) LoggerTest -- hello world/, @mock_logger.message)
          end

          it 'log at a silence level below the default level' do
            SemanticLogger.default_level = :info
            first_message                = nil
            @logger.measure_info('hello world', silence: :trace) do
              @logger.debug('hello world', @hash) { 'Calculations' }
              SemanticLogger.flush
              first_message = @mock_logger.message
            end
            assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ D \[\d+:#{@thread_name}\] LoggerTest -- hello world -- Calculations -- #{@hash_str}/, first_message)
            SemanticLogger.flush
            # Only the last log message is kept in mock logger
            assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ I \[\d+:#{@thread_name}\] \((\d+\.\d+)|(\d+)ms\) LoggerTest -- hello world/, @mock_logger.message)
          end
        end

        describe '.default_level' do
          before do
            SemanticLogger.default_level = :debug
          end

          it 'not log at a level below the global default' do
            assert_equal :debug, SemanticLogger.default_level
            assert_equal :debug, @logger.level
            @logger.trace('hello world', @hash) { 'Calculations' }
            SemanticLogger.flush
            assert_nil @mock_logger.message
          end

          it 'log at the instance level' do
            assert_equal :debug, SemanticLogger.default_level
            @logger.level = :trace
            assert_equal :trace, @logger.level
            @logger.trace('hello world', @hash) { 'Calculations' }
            SemanticLogger.flush
            assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ T \[\d+:#{@thread_name}\] LoggerTest -- hello world -- Calculations -- #{@hash_str}/, @mock_logger.message)
          end

          it 'not log at a level below the instance level' do
            assert_equal :debug, SemanticLogger.default_level
            @logger.level = :warn
            assert_equal :warn, @logger.level
            @logger.debug('hello world', @hash) { 'Calculations' }
            SemanticLogger.flush
            assert_nil @mock_logger.message
          end
        end

        describe '.silence' do
          before do
            SemanticLogger.default_level = :info
          end

          it 'not log at a level below the silence level' do
            assert_equal :info, SemanticLogger.default_level
            assert_equal :info, @logger.level
            @logger.silence do
              @logger.warn('hello world', @hash) { 'Calculations' }
              @logger.info('hello world', @hash) { 'Calculations' }
              @logger.debug('hello world', @hash) { 'Calculations' }
              @logger.trace('hello world', @hash) { 'Calculations' }
            end
            SemanticLogger.flush
            assert_nil @mock_logger.message
          end

          it 'log at the instance level even with the silencer at a higher level' do
            @logger.level = :trace
            assert_equal :trace, @logger.level
            @logger.silence do
              @logger.trace('hello world', @hash) { 'Calculations' }
            end
            SemanticLogger.flush
            assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ T \[\d+:#{@thread_name}\] LoggerTest -- hello world -- Calculations -- #{@hash_str}/, @mock_logger.message)
          end

          it 'log at a silence level below the default level' do
            assert_equal :info, SemanticLogger.default_level
            assert_equal :info, @logger.level
            @logger.silence(:debug) do
              @logger.debug('hello world', @hash) { 'Calculations' }
            end
            SemanticLogger.flush
            assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ D \[\d+:#{@thread_name}\] LoggerTest -- hello world -- Calculations -- #{@hash_str}/, @mock_logger.message)
          end
        end

        describe '.level?' do
          it 'return true for debug? with :trace level' do
            SemanticLogger.default_level = :trace
            assert_equal :trace, @logger.level
            assert_equal true, @logger.debug?
            assert_equal true, @logger.trace?
          end

          it 'return false for debug? with global :debug level' do
            SemanticLogger.default_level = :debug
            assert_equal :debug, @logger.level, @logger.inspect
            assert_equal true, @logger.debug?, @logger.inspect
            assert_equal false, @logger.trace?, @logger.inspect
          end

          it 'return true for debug? with global :info level' do
            SemanticLogger.default_level = :info
            assert_equal :info, @logger.level, @logger.inspect
            assert_equal false, @logger.debug?, @logger.inspect
            assert_equal false, @logger.trace?, @logger.inspect
          end

          it 'return false for debug? with instance :debug level' do
            @logger.level = :debug
            assert_equal :debug, @logger.level, @logger.inspect
            assert_equal true, @logger.debug?, @logger.inspect
            assert_equal false, @logger.trace?, @logger.inspect
          end

          it 'return true for debug? with instance :info level' do
            @logger.level = :info
            assert_equal :info, @logger.level, @logger.inspect
            assert_equal false, @logger.debug?, @logger.inspect
            assert_equal false, @logger.trace?, @logger.inspect
          end
        end

      end
    end

    # Make sure that measure still logs when a block uses return to return from
    # a function
    def function_with_return(logger)
      logger.measure_info('hello world', payload: @hash) do
        return 'Good'
      end
      'Bad'
    end

  end
end
