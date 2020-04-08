module ChildProcess::Unix::Platform
  SIZEOF = {
     :posix_spawn_file_actions_t => 76,
     :posix_spawnattr_t          => 336,
     :sigset_t                   => 128
  }
  POSIX_SPAWN_RESETIDS   = 1
  POSIX_SPAWN_SETPGROUP  = 2
  POSIX_SPAWN_SETSIGDEF  = 4
  POSIX_SPAWN_SETSIGMASK = 8
  POSIX_SPAWN_USEVFORK   = 64
end
