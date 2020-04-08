require "pleaserun/platform/base"
require "pleaserun/user/base"
require "stud/temporary"
require "insist"

shared_examples_for PleaseRun::Platform do |username="root"|
  if username != "root"
    let(:user) { PleaseRun::User::Base.new.tap { |u| u.name = username; u.platform = "linux" } }
    let(:install_user_file) { Stud::Temporary.file.tap { |f| f.write(user.render_installer) } }
    let(:remove_user_file) { Stud::Temporary.file.tap { |f| f.write(user.render_remover) } }

    before do
      system("sh", install_user_file.path)
    end

    after do
      system("sh", remove_user_file.path)
    end
  end

  it "inherits correctly" do
    insist { described_class.ancestors }.include?(PleaseRun::Platform::Base)
  end

  context "activation" do
    subject { described_class.new(version) }

    before do
      subject.name = "hurray-#{rand(1000)}"
      subject.user = username
      subject.group = username
      subject.program = "/bin/sh"
      subject.args = ["-c", "echo hello world; sleep 5"]
      activate(subject)
      
      # Hack...
      case described_class.name
        when "PleaseRun::Platform::Systemd"
          # monkeypatch StartLimitInterval=0 into the .service file to avoid
          # being throttled by systemd during these tests.
          # Fixes https://github.com/jordansissel/pleaserun/issues/11
          path = File.join(subject.unit_path, "#{subject.name}.service")
          File.write(path, File.read(path).sub(/^\[Service\]$/, "[Service]\nStartLimitInterval=0"))
        when "PleaseRun::Platform::Launchd"
          # Avoid being throttled during our tests.
          path = subject.daemons_path
          File.write(path, File.read(path).sub(/^<plist>$/, "<plist><key>ThrottleInterval</key><integer>0</integer>"))
      end
    end

    after do
      system_quiet(stop)
      case described_class.name
        when "PleaseRun::Platform::Launchd"
          system_quiet("launchctl unload #{subject.daemons_path}")
          system_quiet("launchctl remove #{subject.name}")
      end
      subject.files.each do |path, _|
        File.unlink(path) if File.exist?(path)
      end
    end

    it "should start" do
      starts
      status_running
    end

    it "should stop" do
      starts
      stops
    end

    it "should start and stop", :flapper => true do
      5.times do
        starts
        stops
      end
    end

    context "with prestart", :prestart => true do
      context "that is failing" do
        before do
          subject.prestart = "#!/bin/sh\nfalse\n"
          activate(subject)
        end

        it "should fail to start" do
          insist { starts }.fails
        end
      end

      context "that succeeds" do
        before do
          subject.prestart = "true"
          activate(subject)
        end

        it "should start" do
          starts
        end
      end
    end
  end # as the super user
end
