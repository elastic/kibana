@ECHO OFF

@set debug_args=-J-Xdebug -J-Xrunjdwp:transport=dt_shmem,server=y,suspend=y

IF NOT "%~f0" == "~f0" GOTO :WinNT
@"jruby.exe" %debug_args% %1 %2 %3 %4 %5 %6 %7 %8 %9
GOTO :EOF
:WinNT
@"%~dp0jruby.exe" %debug_args% "%~dpn0" %*
