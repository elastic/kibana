require "English" # for $CHILD_STATUS
require "testenv"
require "pleaserun/platform/launchd"
require "pleaserun/detector"

describe PleaseRun::Platform::Launchd do
  let(:platform) { PleaseRun::Detector.detect[0] }
  let(:version) { PleaseRun::Detector.detect[1] }

  context "deployment", :launchd => true do
    it_behaves_like PleaseRun::Platform do
      let(:start) { "launchctl start #{subject.name}" }
      let(:stop) { "launchctl stop #{subject.name}" }
      let(:status) { "launchctl list | awk '$3 == \"#{subject.name}\" { exit($1 == \"-\") }'" }
      let(:restart) { "launchctl restart #{subject.name}" }
    end

  end

  context "#files" do
    subject do
      runner = PleaseRun::Platform::Launchd.new("10.9")
      runner.name = "fancypants"
      next runner
    end

    let(:files) { subject.files.collect { |path, _| path } }

    it "emits a file in /Library/LaunchDaemons" do
      insist { files }.include?("/Library/LaunchDaemons/fancypants.plist")
    end
  end

  context "#install_actions" do
    subject do
      runner = PleaseRun::Platform::Launchd.new("10.9")
      runner.name = "fancypants"
      next runner
    end

    it "runs 'launchctl load'" do
      insist { subject.install_actions }.include?("launchctl load /Library/LaunchDaemons/fancypants.plist")
    end
  end
end
