#include "../sandbox.hpp"
#include <linux/audit.h>
#include <linux/seccomp.h>
#include <linux/filter.h>
#include <sys/prctl.h>
#include <sys/syscall.h>
#include <errno.h>
#include <stddef.h>
#include <string.h>
#include <unistd.h>
#include "system_headers.hpp"

struct sock_filter reject_syscalls[] = {
  BPF_STMT(BPF_LD|BPF_W|BPF_ABS, (offsetof(struct seccomp_data, arch))),
  BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K, AUDIT_ARCH_X86_64, 0, 8),

  // LD|W|ABS == Load Word at ABSolute offset
  // Load the syscall number
  BPF_STMT(BPF_LD|BPF_W|BPF_ABS, (offsetof(struct seccomp_data, nr))),

  // JMP|JEQ|K Do a jump after comparing EQuality of the loaded value and a
  // constant. If equal, jump N positions forward, if not equal, do not jump(zero jump).
  BPF_JUMP(BPF_JMP|BPF_JGT|BPF_K, __X32_SYSCALL_BIT - 1, 6, 0),
  BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K, __NR_seccomp, 5, 0),
  BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K, __NR_fork, 4, 0),
  BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K, __NR_vfork, 3, 0),
  BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K, __NR_execve, 2, 0),
  BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K, __NR_execveat, 1, 0),

  // RET|K Return a constant.
  // If none of the conditions above are met, let's allow this syscall.
  BPF_STMT(BPF_RET|BPF_K, SECCOMP_RET_ALLOW),

  // RET|K Return a constant
  // If we get here, we'll return an EACCES from the syscall
  BPF_STMT(BPF_RET|BPF_K, SECCOMP_RET_ERRNO|(EACCES&SECCOMP_RET_DATA)),
};

Sandbox::Result Sandbox::activate() {
  struct sock_filter *filter = reject_syscalls;
  unsigned short count = sizeof(reject_syscalls) / sizeof(filter[0]);

  struct sock_fprog prog = {
    .len = count,
    .filter = filter,
  };

  if (prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0)) {
    static const std::string err = "prctl(PR_SET_NO_NEW_PRIVS, ...) failed: ";
    return { false, err + strerror(errno) };
  }

  if (seccomp(SECCOMP_SET_MODE_FILTER, SECCOMP_FILTER_FLAG_TSYNC, &prog)) {
    if (prctl(PR_SET_SECCOMP, SECCOMP_MODE_FILTER, &prog)) {
      static const std::string err = "prctl(PR_SET_SECCOMP, ...) failed: ";
      return { false, err + strerror(errno) };
    }

    return { true, "Sandbox activated using prctl" };
  }

  return { true, "Sandbox activated using seccomp" };
}
