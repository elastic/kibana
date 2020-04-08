module ChildProcess::Unix::Platform
  SIZEOF = {
     :posix_spawn_file_actions_t => 4,
     :posix_spawnattr_t          => 4,
     :sigset_t                   => 16
  }
  POSIX_SPAWN_RESETIDS   = 1
  POSIX_SPAWN_SETPGROUP  = 2
  POSIX_SPAWN_SETSIGDEF  = 4
  POSIX_SPAWN_SETSIGMASK = 8
end
