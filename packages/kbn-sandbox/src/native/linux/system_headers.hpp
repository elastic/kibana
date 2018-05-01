// derived from syscall_64.tbl we want to build a "portable" binary and link against
// an old version of glibc, various syscalls aren't available on these older kernels,
// specifically __NR_execveat and __NR_seccomp
#ifndef __X32_SYSCALL_BIT
#define __X32_SYSCALL_BIT 0x40000000
#endif

#ifndef __NR_seccomp
#define __NR_seccomp 317
#endif

#ifndef __NR_fork
#define __NR_fork 57
#endif

#ifndef __NR_vfork
#define __NR_vfork 58
#endif

#ifndef __NR_vfork
#define __NR_execve 59
#endif

#ifndef __NR_execveat
#define __NR_execveat 322
#endif


// potentially undefined if the <sys/seccomp.h> if from an old kernel
#ifndef SECCOMP_SET_MODE_FILTER
#define SECCOMP_SET_MODE_FILTER 1
#endif

#ifndef SECCOMP_FILTER_FLAG_TSYNC
#define SECCOMP_FILTER_FLAG_TSYNC 1
#endif

#ifndef seccomp
static int seccomp(unsigned int operation, unsigned int flags, void *args)
{
    return syscall(__NR_seccomp, operation, flags, args);
}
#endif
