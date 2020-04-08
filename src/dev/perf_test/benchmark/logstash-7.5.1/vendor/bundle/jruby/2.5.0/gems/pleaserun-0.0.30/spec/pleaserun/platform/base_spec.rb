require "testenv"
require "pleaserun/platform/base"

describe PleaseRun::Platform::Base do
  context "default" do
    subject { PleaseRun::Platform::Base.new("example") }

    it "#name should be nil" do
      insist { subject.name }.nil?
    end

    it "#args should be nil" do
      insist { subject.args }.nil?
    end

    it "#program should be nil" do
      insist { subject.program }.nil?
    end

    it "#user should be root" do
      insist { subject.user } == "root"
    end

    it "#group should be root" do
      insist { subject.group } == "root"
    end

    it "#log_directory should be /var/log" do
      insist { subject.log_directory } == "/var/log"
    end

    context "#log_path" do
      let(:name) { "fancy" }
      before { subject.name = name }

      context "default" do
        it "should be in /var/log" do
          expect(subject.log_path).to(be == "/var/log/#{name}")
        end
      end

      context "when given a directory without trailing slash" do
        let(:path) { "/tmp" }
        before { subject.log_directory = path }
        it "should be <path>/<name>" do
          expect(subject.log_path).to(be == File.join(path, name))
        end
      end

      context "when given a directory with trailing slash" do
        let(:path) { "/tmp/" }
        before { subject.log_directory = path }
        it "should be <path>/<name>" do
          expect(subject.log_path).to(be == File.join(path, name))
        end
      end
    end

    context "#log_path_stderr" do
      let(:name) { "fancy" }
      before { subject.name = name }

      context "default" do
        it "should be in /var/log" do
          expect(subject.log_path_stderr).to(be == "/var/log/#{name}-stderr.log")
        end
      end

      context "when given a directory without trailing slash" do
        let(:path) { "/tmp" }
        before { subject.log_directory = path }
        it "should be <path>/<name>-stderr.log" do
          expect(subject.log_path_stderr).to(be == File.join(path, "#{name}-stderr.log"))
        end
      end

      context "when given a directory with trailing slash" do
        let(:path) { "/tmp/" }
        before { subject.log_directory = path }
        it "should be <path>/<name>-stderr.log" do
          expect(subject.log_path_stderr).to(be == File.join(path, "#{name}-stderr.log"))
        end
      end

      context "when specified as an argument it should use the name" do
        let(:path) { "/var/log" }
        let(:log_file_stderr) { "#{name}-stderr" }
        before { subject.log_file_stderr = log_file_stderr }
        it "should be <path>/<name>-stderr" do
          expect(subject.log_path_stderr).to(be == File.join(path, log_file_stderr))
        end
      end
    end

    context "#log_path_stdout" do
      let(:name) { "fancy" }
      before { subject.name = name }

      context "default" do
        it "should be in /var/log" do
          expect(subject.log_path_stdout).to(be == "/var/log/#{name}-stdout.log")
        end
      end

      context "when given a directory without trailing slash" do
        let(:path) { "/tmp" }
        before { subject.log_directory = path }
        it "should be <path>/<name>-stdout.log" do
          expect(subject.log_path_stdout).to(be == File.join(path, "#{name}-stdout.log"))
        end
      end

      context "when given a directory with trailing slash" do
        let(:path) { "/tmp/" }
        before { subject.log_directory = path }
        it "should be <path>/<name>-stdout.log" do
          expect(subject.log_path_stdout).to(be == File.join(path, "#{name}-stdout.log"))
        end
      end

      context "when specified as an argument it should use the name" do
        let(:path) { "/var/log" }
        let(:log_file_stdout) { "#{name}-stdout" }
        before { subject.log_file_stdout = log_file_stdout }
        it "should be <path>/<name>-stdout" do
          expect(subject.log_path_stdout).to(be == File.join(path, log_file_stdout))
        end
      end
    end
  end
end
