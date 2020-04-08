require "cabin"
require "open4"

cmd = 'strace -e trace=write date'

logger = Cabin::Channel.get
logger.subscribe(STDOUT)
logger.level = :info

status = Open4::popen4(cmd) do |pid, stdin, stdout, stderr|
  stdin.close
  logger.pipe(stdout => :info, stderr => :error)
end

