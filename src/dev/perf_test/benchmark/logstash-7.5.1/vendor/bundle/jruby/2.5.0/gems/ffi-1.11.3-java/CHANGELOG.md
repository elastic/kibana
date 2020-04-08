1.11.3 / 2019-11-25
-------------------

Removed:
* Remove support for tainted objects which cause deprecation warnings in ruby-2.7. #730


1.11.2 / 2019-11-11
-------------------

Added:
* Add DragonFlyBSD as a platform. #724

Changed:
* Sort all types.conf files, so that files and changes are easier to compare.
* Regenerated type conf for freebsd12 and x86_64-linux targets. #722
* Remove MACOSX_DEPLOYMENT_TARGET that was targeting very old version 10.4. #647
* Fix library name mangling for non glibc Linux/UNIX. #727
* Fix compiler warnings raised by ruby-2.7
* Update libffi to latest master.


1.11.1 / 2019-05-20
-------------------

Changed:
* Raise required ruby version to >=2.0. #699, #700
* Fix a possible linker error on ruby < 2.3 on Linux.


1.11.0 / 2019-05-17
-------------------
This version was yanked on 2019-05-20 to fix an install issue on ruby-1.9.3. #700

Added:
* Add ability to disable or force use of system libffi. #669
  Use like `gem inst ffi -- --enable-system-libffi` .
* Add ability to call FFI callbacks from outside of FFI call frame. #584
* Add proper documentation to FFI::Generator and ::Task
* Add gemspec metadata. #696, #698

Changed:
* Fix stdcall on Win32. #649, #669
* Fix load paths for FFI::Generator::Task
* Fix FFI::Pointer#read_string(0) to return a binary String. #692
* Fix benchmark suite so that it runs on ruby-2.x
* Move FFI::Platform::CPU from C to Ruby. #663
* Move FFI::StructByReference to Ruby. #681
* Move FFI::DataConverter to Ruby (#661)
* Various cleanups and improvements of specs and benchmarks

Removed:
* Remove ruby-1.8 and 1.9 compatibility code. #683
* Remove unused spec files. #684


1.10.0 / 2019-01-06
-------------------

Added:
* Add /opt/local/lib/ to ffi's fallback library search path. #638
* Add binary gem support for ruby-2.6 on Windows
* Add FreeBSD on AArch64 and ARM support. #644
* Add FFI::LastError.winapi_error on Windows native or Cygwin. #633

Changed:
* Update to rake-compiler-dock-0.7.0
* Use 64-bit inodes on FreeBSD >= 12. #644
* Switch time_t and suseconds_t types to long on FreeBSD. #627
* Make register_t long_long on 64-bit FreeBSD. #644
* Fix Pointer#write_array_of_type #637

Removed:
* Drop binary gem support for ruby-2.0 and 2.1 on Windows


1.9.25 / 2018-06-03
-------------------

Changed:
* Revert closures via libffi.
  This re-adds ClosurePool and fixes compat with SELinux enabled systems. #621


1.9.24 / 2018-06-02
-------------------

Security Note:

This update addresses vulnerability CVE-2018-1000201: DLL loading issue which can be hijacked on Windows OS, when a Symbol is used as DLL name instead of a String. Found by Matthew Bush.

Added:
* Added a CHANGELOG file
* Add mips64(eb) support, and mips r6 support. (#601)

Changed:
* Update libffi to latest changes on master.
* Don't search in hardcoded /usr paths on Windows.
* Don't treat Symbol args different to Strings in ffi_lib.
* Make sure size_t is defined in Thread.c. Fixes #609


1.9.23 / 2018-02-25
-------------------

Changed:
* Fix unnecessary rebuild of configure in darwin multi arch. Fixes #605


1.9.22 / 2018-02-22
-------------------

Changed:
* Update libffi to latest changes on master.
* Update detection of system libffi to match new requirements. Fixes #617
* Prefer bundled libffi over system libffi on Mac OS.
* Do closures via libffi. This removes ClosurePool and fixes compat with PaX. #540
* Use a more deterministic gem packaging.
* Fix unnecessary update of autoconf files at gem install.


1.9.21 / 2018-02-06
-------------------

Added:
* Ruby-2.5 support by Windows binary gems. Fixes #598
* Add missing win64 types.
* Added support for Bitmask. (#573)
* Add support for MSYS2 (#572) and Sparc64 Linux. (#574)

Changed:
* Fix read_string to not throw an error on length 0.
* Don't use absolute paths for sh and env. Fixes usage on Adroid #528
* Use Ruby implementation for `which` for better compat with Windows. Fixes #315
* Fix compatibility with PPC64LE platform. (#577)
* Normalize sparc64 to sparcv9. (#575)

Removed:
* Drop Ruby 1.8.7 support (#480)


1.9.18 / 2017-03-03
-------------------

Added:
* Add compatibility with Ruby-2.4.

Changed:
* Add missing shlwapi.h include to fix Windows build.
* Avoid undefined behaviour of LoadLibrary() on Windows. #553


1.9.17 / 2017-01-13
-------------------
