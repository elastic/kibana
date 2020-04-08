# frozen_string_literal: true

RSpec.describe Faraday::ClientError do
  describe '.initialize' do
    subject { described_class.new(exception, response) }
    let(:response) { nil }

    context 'with exception only' do
      let(:exception) { RuntimeError.new('test') }

      it { expect(subject.wrapped_exception).to eq(exception) }
      it { expect(subject.response).to be_nil }
      it { expect(subject.message).to eq(exception.message) }
      it { expect(subject.backtrace).to eq(exception.backtrace) }
      it { expect(subject.inspect).to eq('#<Faraday::ClientError wrapped=#<RuntimeError: test>>') }
    end

    context 'with response hash' do
      let(:exception) { { status: 400 } }

      it { expect(subject.wrapped_exception).to be_nil }
      it { expect(subject.response).to eq(exception) }
      it { expect(subject.message).to eq('the server responded with status 400') }
      it { expect(subject.inspect).to eq('#<Faraday::ClientError response={:status=>400}>') }
    end

    context 'with string' do
      let(:exception) { 'custom message' }

      it { expect(subject.wrapped_exception).to be_nil }
      it { expect(subject.response).to be_nil }
      it { expect(subject.message).to eq('custom message') }
      it { expect(subject.inspect).to eq('#<Faraday::ClientError #<Faraday::ClientError: custom message>>') }
    end

    context 'with anything else #to_s' do
      let(:exception) { %w[error1 error2] }

      it { expect(subject.wrapped_exception).to be_nil }
      it { expect(subject.response).to be_nil }
      it { expect(subject.message).to eq('["error1", "error2"]') }
      it { expect(subject.inspect).to eq('#<Faraday::ClientError #<Faraday::ClientError: ["error1", "error2"]>>') }
    end

    context 'maintains backward-compatibility until 1.0' do
      it 'does not raise an error for error-namespaced classes but prints an error message' do
        error_message, error = with_warn_squelching { Faraday::Error::ClientError.new('foo') }

        expect(error).to be_a Faraday::ClientError
        expect(error_message).to match(
          Regexp.new(
            'NOTE: Faraday::Error::ClientError.new is deprecated; '\
            'use Faraday::ClientError.new instead. It will be removed in or after version 1.0'
          )
        )
      end

      it 'does not raise an error for inherited error-namespaced classes but prints an error message' do
        error_message, = with_warn_squelching { Class.new(Faraday::Error::ClientError) }

        expect(error_message).to match(
          Regexp.new(
            'NOTE: Inheriting Faraday::Error::ClientError is deprecated; '\
            'use Faraday::ClientError instead. It will be removed in or after version 1.0'
          )
        )
      end

      it 'allows backward-compatible class to be subclassed' do
        expect {
          with_warn_squelching { Class.new(Faraday::Error::ClientError) }
        }.not_to raise_error
      end

      it 'allows rescuing of a current error with a deprecated error' do
        expect { raise Faraday::ClientError, nil }.to raise_error(Faraday::Error::ClientError)
      end

      it 'allows rescuing of a current error with a current error' do
        expect { raise Faraday::ClientError, nil }.to raise_error(Faraday::ClientError)
      end

      it 'allows rescuing of a deprecated error with a deprecated error' do
        expect { raise Faraday::Error::ClientError, nil }.to raise_error(Faraday::Error::ClientError)
      end

      it 'allows rescuing of a deprecated error with a current error' do
        expect { raise Faraday::Error::ClientError, nil }.to raise_error(Faraday::ClientError)
      end
    end

    def with_warn_squelching
      stderr_catcher = StringIO.new
      original_stderr = $stderr
      $stderr = stderr_catcher
      result = yield if block_given?
      [stderr_catcher.tap(&:rewind).string, result]
    ensure
      $stderr = original_stderr
    end
  end
end
