require "testenv"
require "pleaserun/platform/sysv"
require "pleaserun/detector"

describe PleaseRun::Platform::SYSV do
  let(:platform) { PleaseRun::Detector.detect[0] }
  let(:version) { PleaseRun::Detector.detect[1] }

  context "deployment", :sysv => true do
    etc_initd_writable = File.stat("/etc/init.d").writable? rescue false
    p :WRIT => etc_initd_writable
    if !etc_initd_writable
      it "cannot write to /etc/init.d, so there's no deployment test to do. To run these tests, you'll need to run this as root, and preferrably in a vm or other temporary system"
    else
      it_behaves_like PleaseRun::Platform do
        let(:skip) { "Cannot write to /etc/init.d" } unless etc_initd_writable
        let(:start) { "/etc/init.d/#{subject.name} start" }
        let(:stop) { "/etc/init.d/#{subject.name} stop" }
        let(:status) { "/etc/init.d/#{subject.name} status" }
        let(:restart) { "/etc/init.d/#{subject.name} restart" }
      end
    end
  end

  context "#files" do
    subject do
      runner = PleaseRun::Platform::SYSV.new("ubuntu-12.04")
      runner.name = "fancypants"
      next runner
    end

    let(:files) { subject.files.collect { |path, _| path } }

    it "emits a file in /etc/init.d/" do
      insist { files }.include?("/etc/init.d/fancypants")
    end
    it "emits a file in /etc/default/" do
      insist { files }.include?("/etc/default/fancypants")
    end
  end
end
