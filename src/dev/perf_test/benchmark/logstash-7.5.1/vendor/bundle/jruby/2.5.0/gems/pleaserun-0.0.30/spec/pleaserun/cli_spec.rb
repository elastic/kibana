require "pleaserun/cli"

describe PleaseRun::CLI do
  subject { PleaseRun::CLI.new("pleaserun") }

  context "when setting --install-prefix" do
    let(:output) { Stud::Temporary.directory }
    let(:name) { rand(10).times.collect { (rand(26) + 97).chr }.join }
    let(:args) { [ "--install", "--install-prefix", output, "--no-install-actions", "-p", "sysv", "-v", "lsb-3.1", "--name", name, "/some/example" ] }

    before do
      subject.run(args)
    end

    after do
      FileUtils.rm_r(output) if File.directory?(output)
    end

    it "should write files there" do
      [ "/etc", "/etc/init.d", "/etc/init.d/#{name}" ].each do |path|
        expect(File).to be_exists(File.join(output, path))
      end
    end
  end
end
