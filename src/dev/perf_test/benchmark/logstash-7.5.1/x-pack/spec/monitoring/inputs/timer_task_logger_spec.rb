# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require "spec_helper"
require "monitoring/inputs/timer_task_logger"

describe LogStash::Inputs::TimerTaskLogger do
  subject { described_class.new }

  context "#update" do
    let(:run_at) { Time.now }
    let(:result) { :dummy_result }

    context "when there is no exception" do
      it "successfully run" do
        expect { subject.update(run_at, result, nil) }.not_to raise_error
      end
    end

    context "when there is an exception" do
      context "Concurrent::TimeoutError" do
        let(:exception) { Concurrent::TimeoutError.new }

        it "logs the exception in debug mode" do
          expect(subject.logger).to receive(:debug).with(/metric shipper/, hash_including(:exception => exception.class, :message => exception.message ))
          subject.update(run_at, result, exception)
        end
      end

      context "Any other exception" do
        let(:exception) { ArgumentError.new }

        it "logs the exception in debug mode" do
          expect(subject.logger).to receive(:error).with(/metric shipper/, hash_including(:exception => exception.class, :message => exception.message ))
          subject.update(run_at, result, exception)
        end
      end
    end
  end
end
