require "pleaserun/detector"

describe PleaseRun::Detector do
  context "#execute" do
    it "should return a process failure if the path doesn't exist" do
      out, success = subject.execute(["hopefully this program does not exist", "whatever"])
      expect(success).to be_falsey
    end

    it "should return a process failure if the path is a directory" do
      out, success = subject.execute(["/", "whatever"])
      expect(success).to be_falsey
    end
  end
end
