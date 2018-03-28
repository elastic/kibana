#include "sandbox.hpp"

#include <linux/seccomp.h>
#include <linux/filter.h>
#include <sys/syscall.h>
#include <stddef.h>
#include <errno.h>
#include <sys/prctl.h>

#include <string.h> /* for strerror */

// execveat was added in Linux 3.19
#ifndef __NR_execveat
#define JMP_START 4
#else
#define JMP_START 5
#endif

struct sock_filter reject_syscalls[] = {
  // TODO(sissel): Verify arch of syscall
  //BPF_STMT(BPF_LD|BPF_W|BPF_ABS, (offsetof(struct seccomp_data, arch))),
  //BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K, ARCH_NR, 1, 0), 

  // LD|W|ABS == Load Word at ABSolute offset
  // Load the syscall number
  BPF_STMT(BPF_LD|BPF_W|BPF_ABS, (offsetof(struct seccomp_data, nr))),

  // JMP|JEQ|K Do a jump after comparing EQuality of the loaded value and a
  // constant. If equal, jump N positions forward, if not equal, do not jump(zero jump).
  BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K, __NR_seccomp, JMP_START, 0),
  BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K, __NR_fork, JMP_START - 1, 0),
  BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K, __NR_vfork, JMP_START - 2, 0),
  BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K, __NR_execve, JMP_START - 3, 0),

#ifdef __NR_execveat
  BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K, __NR_execveat, JMP_START - 4, 0),
#endif

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
    static const std::string prctl_privs_error = "prctl(PR_SET_NO_NEW_PRIVS, ...) failed: ";
    return { false, prctl_privs_error + strerror(errno) };
  }

  if (prctl(PR_SET_SECCOMP, SECCOMP_MODE_FILTER, &prog)) {
    static const std::string prctl_seccomp_error = "prctl(PR_SET_SECCOMP, ...) failed: ";
    return { false, prctl_seccomp_error + strerror(errno) };
  }

  return Sandbox::SUCCESS;
}
