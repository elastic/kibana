module ChildProcess
  module Windows
    # typedef struct _STARTUPINFO {
    #   DWORD  cb;
    #   LPTSTR lpReserved;
    #   LPTSTR lpDesktop;
    #   LPTSTR lpTitle;
    #   DWORD  dwX;
    #   DWORD  dwY;
    #   DWORD  dwXSize;
    #   DWORD  dwYSize;
    #   DWORD  dwXCountChars;
    #   DWORD  dwYCountChars;
    #   DWORD  dwFillAttribute;
    #   DWORD  dwFlags;
    #   WORD   wShowWindow;
    #   WORD   cbReserved2;
    #   LPBYTE lpReserved2;
    #   HANDLE hStdInput;
    #   HANDLE hStdOutput;
    #   HANDLE hStdError;
    # } STARTUPINFO, *LPSTARTUPINFO;

    class StartupInfo < FFI::Struct
      layout :cb,               :ulong,
             :lpReserved,       :pointer,
             :lpDesktop,        :pointer,
             :lpTitle,          :pointer,
             :dwX,              :ulong,
             :dwY,              :ulong,
             :dwXSize,          :ulong,
             :dwYSize,          :ulong,
             :dwXCountChars,    :ulong,
             :dwYCountChars,    :ulong,
             :dwFillAttribute,  :ulong,
             :dwFlags,          :ulong,
             :wShowWindow,      :ushort,
             :cbReserved2,      :ushort,
             :lpReserved2,      :pointer,
             :hStdInput,        :pointer, # void ptr
             :hStdOutput,       :pointer, # void ptr
             :hStdError,        :pointer # void ptr
    end

    #
    # typedef struct _PROCESS_INFORMATION {
    #   HANDLE hProcess;
    #   HANDLE hThread;
    #   DWORD  dwProcessId;
    #   DWORD  dwThreadId;
    # } PROCESS_INFORMATION, *LPPROCESS_INFORMATION;
    #

    class ProcessInfo < FFI::Struct
      layout :hProcess,    :pointer, # void ptr
             :hThread,     :pointer, # void ptr
             :dwProcessId, :ulong,
             :dwThreadId,  :ulong
    end

    #
    # typedef struct _SECURITY_ATTRIBUTES {
    #   DWORD  nLength;
    #   LPVOID lpSecurityDescriptor;
    #   BOOL   bInheritHandle;
    # } SECURITY_ATTRIBUTES, *PSECURITY_ATTRIBUTES, *LPSECURITY_ATTRIBUTES;
    #

    class SecurityAttributes < FFI::Struct
      layout :nLength,              :ulong,
             :lpSecurityDescriptor, :pointer, # void ptr
             :bInheritHandle,       :int

      def initialize(opts = {})
        super()

        self[:nLength]              = self.class.size
        self[:lpSecurityDescriptor] = nil
        self[:bInheritHandle]       = opts[:inherit] ? 1 : 0
      end
    end

    #
    # typedef struct _JOBOBJECT_BASIC_LIMIT_INFORMATION {
    #   LARGE_INTEGER PerProcessUserTimeLimit;
    #   LARGE_INTEGER PerJobUserTimeLimit;
    #   DWORD         LimitFlags;
    #   SIZE_T        MinimumWorkingSetSize;
    #   SIZE_T        MaximumWorkingSetSize;
    #   DWORD         ActiveProcessLimit;
    #   ULONG_PTR     Affinity;
    #   DWORD         PriorityClass;
    #   DWORD         SchedulingClass;
    # } JOBOBJECT_BASIC_LIMIT_INFORMATION, *PJOBOBJECT_BASIC_LIMIT_INFORMATION;
    #
    class JobObjectBasicLimitInformation < FFI::Struct
      layout :PerProcessUserTimeLimit, :int64,
             :PerJobUserTimeLimit,     :int64,
             :LimitFlags,              :ulong,
             :MinimumWorkingSetSize,   :size_t,
             :MaximumWorkingSetSize,   :size_t,
             :ActiveProcessLimit,      :ulong,
             :Affinity,                :pointer,
             :PriorityClass,           :ulong,
             :SchedulingClass,         :ulong
    end

    #
    # typedef struct _IO_COUNTERS {
    #   ULONGLONG ReadOperationCount;
    #   ULONGLONG WriteOperationCount;
    #   ULONGLONG OtherOperationCount;
    #   ULONGLONG ReadTransferCount;
    #   ULONGLONG WriteTransferCount;
    #   ULONGLONG OtherTransferCount;
    # } IO_COUNTERS, *PIO_COUNTERS;
    #

    class IoCounters < FFI::Struct
      layout :ReadOperationCount,  :ulong_long,
             :WriteOperationCount, :ulong_long,
             :OtherOperationCount, :ulong_long,
             :ReadTransferCount,   :ulong_long,
             :WriteTransferCount,  :ulong_long,
             :OtherTransferCount,  :ulong_long
    end
    #
    # typedef struct _JOBOBJECT_EXTENDED_LIMIT_INFORMATION {
    #   JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
    #   IO_COUNTERS                       IoInfo;
    #   SIZE_T                            ProcessMemoryLimit;
    #   SIZE_T                            JobMemoryLimit;
    #   SIZE_T                            PeakProcessMemoryUsed;
    #   SIZE_T                            PeakJobMemoryUsed;
    # } JOBOBJECT_EXTENDED_LIMIT_INFORMATION, *PJOBOBJECT_EXTENDED_LIMIT_INFORMATION;
    #

    class JobObjectExtendedLimitInformation < FFI::Struct
      layout :BasicLimitInformation, JobObjectBasicLimitInformation,
             :IoInfo,                IoCounters,
             :ProcessMemoryLimit,    :size_t,
             :JobMemoryLimit,        :size_t,
             :PeakProcessMemoryUsed, :size_t,
             :PeakJobMemoryUsed,     :size_t
    end


  end # Windows
end # ChildProcess