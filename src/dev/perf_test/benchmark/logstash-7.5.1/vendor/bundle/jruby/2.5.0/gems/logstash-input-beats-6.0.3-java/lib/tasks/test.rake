# encoding: utf-8
OS_PLATFORM = RbConfig::CONFIG["host_os"]
VENDOR_PATH = File.expand_path(File.join(File.dirname(__FILE__), "..", "..", "vendor"))

#TODO: Figure out better means to keep this version in sync
if OS_PLATFORM == "linux"
  FILEBEAT_URL = "https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-6.5.4-linux-x86_64.tar.gz"
elsif OS_PLATFORM == "darwin"
  FILEBEAT_URL = "https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-6.5.4-darwin-x86_64.tar.gz"
end

LSF_URL = "https://download.elastic.co/logstash-forwarder/binaries/logstash-forwarder_#{OS_PLATFORM}_amd64"

require "fileutils"
@files=[]

task :default do
  system("rake -T")
end

require "logstash/devutils/rake"

namespace :test do
  namespace :integration do
    task :setup do
      Rake::Task["test:integration:setup:filebeat"].invoke
      Rake::Task["test:integration:setup:lsf"].invoke
    end

    namespace :setup do
      desc "Download lastest stable version of Logstash-forwarder"
      task :lsf do
        destination = File.join(VENDOR_PATH, "logstash-forwarder")
        FileUtils.rm_rf(destination)
        FileUtils.mkdir_p(destination)
        download_destination = File.join(destination, "logstash-forwarder")
        puts "Logstash-forwarder: downloading from #{LSF_URL} to #{download_destination}"
        download(LSF_URL, download_destination)
        File.chmod(0755, download_destination)
      end

      desc "Download nigthly filebeat for integration testing"
      task :filebeat do
        FileUtils.mkdir_p(VENDOR_PATH)
        download_destination = File.join(VENDOR_PATH, "filebeat.tar.gz")
        destination = File.join(VENDOR_PATH, "filebeat")
        FileUtils.rm_rf(download_destination)
        FileUtils.rm_rf(destination)
        FileUtils.rm_rf(File.join(VENDOR_PATH, "filebeat.tar"))
        puts "Filebeat: downloading from #{FILEBEAT_URL} to #{download_destination}"
        download(FILEBEAT_URL, download_destination)

        untar_all(download_destination, File.join(VENDOR_PATH, "filebeat")) { |e| e }
      end
    end
  end
end

# Uncompress all the file from the archive this only work with 
# one level directory structure and its fine for LSF and filebeat packaging.
def untar_all(file, destination)
  untar(file) do |entry| 
    out = entry.full_name.split("/").last
    File.join(destination, out)
  end
end
