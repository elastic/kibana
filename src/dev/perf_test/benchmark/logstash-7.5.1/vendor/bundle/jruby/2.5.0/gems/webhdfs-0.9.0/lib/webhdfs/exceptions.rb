module WebHDFS; end
class WebHDFS::Error < StandardError; end

class WebHDFS::FileNotFoundError < WebHDFS::Error; end

class WebHDFS::IOError < WebHDFS::Error; end
class WebHDFS::SecurityError < WebHDFS::Error; end

class WebHDFS::ClientError < WebHDFS::Error; end
class WebHDFS::ServerError < WebHDFS::Error; end

class WebHDFS::RequestFailedError < WebHDFS::Error; end

class WebHDFS::KerberosError < WebHDFS::Error; end
