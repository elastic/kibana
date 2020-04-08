require "testenv"
require "pleaserun/platform/upstart"
require "pleaserun/detector"

describe PleaseRun::Platform::Upstart do
  let(:platform) { "upstart" }
  let(:version) { "1.5" }

  context "deployment", :upstart => true do
    it_behaves_like PleaseRun::Platform do
      let(:start) { "initctl start #{subject.name}" }
      let(:stop) { "initctl stop #{subject.name}" }
      let(:status) { "initctl status #{subject.name} | egrep -v '#{subject.name} stop/'" }
      let(:restart) { "initctl restart #{subject.name}" }
    end

    it_behaves_like PleaseRun::Platform, "pleaserun-test" do
      let(:start) { "initctl start #{subject.name}" }
      let(:stop) { "initctl stop #{subject.name}" }
      let(:status) { "initctl status #{subject.name} | egrep -v '#{subject.name} stop/'" }
      let(:restart) { "initctl restart #{subject.name}" }
    end
  end

  context "#files" do
    subject do
      runner = PleaseRun::Platform::Upstart.new(version)
      runner.name = "fancypants"
      next runner
    end

    let(:files) { subject.files.collect { |path, _| path } }

    it "emits a file in /etc/init/" do
      insist { files }.include?("/etc/init/fancypants.conf")
    end
  end

  context "#install_actions" do
    subject do
      runner = PleaseRun::Platform::Upstart.new(version)
      runner.name = "fancypants"
      next runner
    end

    it "has no install actions" do
      insist { subject.install_actions }.empty?
    end
  end
end
