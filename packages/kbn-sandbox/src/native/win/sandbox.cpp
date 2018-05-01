#include "../sandbox.hpp"
#include <windows.h>

Sandbox::Result LastErrorAsResult() {
    DWORD error = GetLastError();
    LPVOID errorMessage;
    FormatMessage(FORMAT_MESSAGE_ALLOCATE_BUFFER | FORMAT_MESSAGE_FROM_SYSTEM | FORMAT_MESSAGE_IGNORE_INSERTS,
        NULL, error, MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT), (LPTSTR) &errorMessage, 0, NULL );

    return { false, (char *) errorMessage };
}

Sandbox::Result Sandbox::activate() {
    HANDLE job = CreateJobObject(NULL, NULL);
    if (job == NULL) {
        return LastErrorAsResult();
    }

    JOBOBJECT_BASIC_LIMIT_INFORMATION limits;
    BOOL ok;

    ok = QueryInformationJobObject(job, JobObjectBasicLimitInformation, &limits, sizeof(limits), NULL);
    if (!ok) {
        return LastErrorAsResult();
    }

    limits.ActiveProcessLimit = 1;
    limits.LimitFlags = JOB_OBJECT_LIMIT_ACTIVE_PROCESS;
    ok = SetInformationJobObject(job, JobObjectBasicLimitInformation, &limits, sizeof(limits));
    if (!ok) {
        return LastErrorAsResult();
    }

    ok = AssignProcessToJobObject(job, GetCurrentProcess());
    if (!ok) {
        return LastErrorAsResult();
    }

    return Sandbox::SUCCESS;
}