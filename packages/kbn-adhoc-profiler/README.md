# @kbn/adhoc-profiler

This package offers tools for ad hoc profiling. Currently it only exports one method: `inspectCpuProfile`, which will start a CPU profile before executing the callback it is given, and opens the collected profile in a web browser. It assumes that you have `go` and [`pprof`](https://github.com/google/pprof) installed.

Profiles are stored in the user's temporary directory (returned from `os.tmpdir()`).
