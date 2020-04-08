require "testenv"
require "pleaserun/platform/systemd"

describe PleaseRun::Platform::Systemd do
  let(:platform) { "systemd" }
  let(:version) { "default" }

  context "deployment", :systemd => true do
    it_behaves_like PleaseRun::Platform do
      let(:start) { "systemctl start #{subject.name}.service" }
      let(:stop) { "systemctl stop #{subject.name}.service" }
      let(:status) { "systemctl show #{subject.name} | grep -q SubState=running" }
      let(:restart) { "systemctl restart #{subject.name}.service" }
    end
  end

  context "#files" do
    subject do
      runner = described_class.new(version)
      runner.name = "fancypants"
      runner.program = "/bin/true"
      next runner
    end

    let(:files) { subject.files.collect { |path, _| path } }

    context "by default" do
      it "emits a file in /etc/systemd/system" do
        insist { files }.include?("/etc/systemd/system/fancypants.service")
      end
    end
  end

  context "#install_actions" do
    subject do
      runner = described_class.new(version)
      runner.name = "fancypants"
      next runner
    end

    it "invokes systemctl to reload" do
      insist { subject.install_actions }.include?("systemctl --system daemon-reload")
    end
  end
end
