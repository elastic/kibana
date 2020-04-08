# encoding: utf-8
require "net/http"
require "uri"
require "digest/sha1"
require 'fileutils'

module LogStash::Util::FileTools
  extend self

  def fetch(url, sha1, output)

    puts "Downloading #{url}"
    actual_sha1 = download(url, output)

    if actual_sha1 != sha1
      fail "SHA1 does not match (expected '#{sha1}' but got '#{actual_sha1}')"
    end
  end # def fetch

  def file_fetch(url, sha1, target)
    filename = File.basename( URI(url).path )
    output = "#{target}/#{filename}"
    begin
      actual_sha1 = file_sha1(output)
      if actual_sha1 != sha1
        fetch(url, sha1, output)
      end
    rescue Errno::ENOENT
      fetch(url, sha1, output)
    end
    return output
  end

  def file_sha1(path)
    digest = Digest::SHA1.new
    fd = File.new(path, "r")
    while true
      begin
        digest << fd.sysread(16384)
      rescue EOFError
        break
      end
    end
    return digest.hexdigest
  ensure
    fd.close if fd
  end

  def download(url, output)
    uri = URI(url)
    digest = Digest::SHA1.new
    tmp = "#{output}.tmp"
    Net::HTTP.start(uri.host, uri.port, :use_ssl => (uri.scheme == "https")) do |http|
      request = Net::HTTP::Get.new(uri.path)
      http.request(request) do |response|
        fail "HTTP fetch failed for #{url}. #{response}" if [200, 301].include?(response.code)
        size = (response["content-length"].to_i || -1).to_f
        count = 0
        File.open(tmp, "w") do |fd|
          response.read_body do |chunk|
            fd.write(chunk)
            digest << chunk
            if size > 0 && $stdout.tty?
              count += chunk.bytesize
              $stdout.write(sprintf("\r%0.2f%%", count/size * 100))
            end
          end
        end
        $stdout.write("\r      \r") if $stdout.tty?
      end
    end

    File.rename(tmp, output)

    return digest.hexdigest
  rescue SocketError => e
    puts "Failure while downloading #{url}: #{e}"
    raise
  ensure
    File.unlink(tmp) if File.exist?(tmp)
  end # def download

  def untar(tarball, &block)
    require "archive/tar/minitar"
    tgz = Zlib::GzipReader.new(File.open(tarball))
    # Pull out typesdb
    tar = Archive::Tar::Minitar::Input.open(tgz)
    tar.each do |entry|
      path = block.call(entry)
      next if path.nil?
      parent = File.dirname(path)

      FileUtils.mkdir_p(parent) unless File.directory?(parent)

      # Skip this file if the output file is the same size
      if entry.directory?
        FileUtils.mkdir_p(path) unless File.directory?(path)
      else
        entry_mode = entry.instance_eval { @mode } & 0777
        if File.exists?(path)
          stat = File.stat(path)
          # TODO(sissel): Submit a patch to archive-tar-minitar upstream to
          # expose headers in the entry.
          entry_size = entry.instance_eval { @size }
          # If file sizes are same, skip writing.
          next if stat.size == entry_size && (stat.mode & 0777) == entry_mode
        end
        puts "Extracting #{entry.full_name} from #{tarball} #{entry_mode.to_s(8)}"
        File.open(path, "w") do |fd|
          # eof? check lets us skip empty files. Necessary because the API provided by
          # Archive::Tar::Minitar::Reader::EntryStream only mostly acts like an
          # IO object. Something about empty files in this EntryStream causes
          # IO.copy_stream to throw "can't convert nil into String" on JRuby
          # TODO(sissel): File a bug about this.
          while !entry.eof?
            chunk = entry.read(16384)
            fd.write(chunk)
          end
            #IO.copy_stream(entry, fd)
        end
        File.chmod(entry_mode, path)
      end
    end
    tar.close
    File.unlink(tarball) if File.file?(tarball)
  end # def untar

  def do_ungz(file)

    outpath = file.gsub('.gz', '')
    tgz = Zlib::GzipReader.new(File.open(file))
    begin
      File.open(outpath, "w") do |out|
        IO::copy_stream(tgz, out)
      end
      File.unlink(file)
    rescue
      File.unlink(outpath) if File.file?(outpath)
     raise
    end
    tgz.close
  end

  def eval_file(entry, files, prefix)
    return false if entry.full_name =~ /PaxHeaders/
    if !files.nil?
      if files.is_a?(Array)
        return false unless files.include?(entry.full_name.gsub(prefix, ''))
        entry.full_name.split("/").last
      elsif files.is_a?(String)
        return false unless entry.full_name =~ Regexp.new(files)
        entry.full_name.split("/").last
      end
    else
      entry.full_name.gsub(prefix, '')
    end
  end

  def process_downloads(files,target='')

    FileUtils.mkdir_p(target) unless File.directory?(target)

    files.each do |file|
      download = file_fetch(file['url'], file['sha1'],target)

      if download =~ /.tar.gz/
        prefix = download.gsub('.tar.gz', '').gsub("#{target}/", '')
        untar(download) do |entry|
          next unless out = eval_file(entry, file['files'], prefix)
          File.join(target, out)
        end

      elsif download =~ /.tgz/
        prefix = download.gsub('.tgz', '').gsub("#{target}/", '')
        untar(download) do |entry|
          next unless out = eval_file(entry, file['files'], prefix)
          File.join(target, out)
        end

      elsif download =~ /.gz/
        do_ungz(download)
      end
    end
  end

end
