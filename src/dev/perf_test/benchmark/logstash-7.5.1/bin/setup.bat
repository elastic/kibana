@echo off

set SCRIPT=%0

rem ### 1: determine logstash home

rem  to do this, we strip from the path until we
rem find bin, and then strip bin (there is an assumption here that there is no
rem nested directory under bin also named bin)

for %%I in (%SCRIPT%) do set LS_HOME=%%~dpI

:ls_home_loop
for %%I in ("%LS_HOME:~1,-1%") do set DIRNAME=%%~nxI
if not "%DIRNAME%" == "bin" (
  for %%I in ("%LS_HOME%..") do set LS_HOME=%%~dpfI
  goto ls_home_loop
)
for %%I in ("%LS_HOME%..") do set LS_HOME=%%~dpfI

rem ### 2: set java

if defined JAVA_HOME (
  set JAVA="%JAVA_HOME%\bin\java.exe"
) else (
  for %%I in (java.exe) do set JAVA="%%~$PATH:I"
)

if not exist %JAVA% (
  echo could not find java; set JAVA_HOME or ensure java is in PATH 1>&2
  exit /b 1
)

rem do not let JAVA_TOOL_OPTIONS slip in (as the JVM does by default)
if not "%JAVA_TOOL_OPTIONS%" == "" (
  echo "warning: ignoring JAVA_TOOL_OPTIONS=$JAVA_TOOL_OPTIONS"
  set JAVA_TOOL_OPTIONS=
)

rem JAVA_OPTS is not a built-in JVM mechanism but some people think it is so we
rem warn them that we are not observing the value of %JAVA_OPTS%
if not "%JAVA_OPTS%" == "" (
  echo|set /p="warning: ignoring JAVA_OPTS=%JAVA_OPTS%; "
  echo pass JVM parameters via LS_JAVA_OPTS
)

rem ### 3: set jruby

set JRUBY_BIN="%LS_HOME%\vendor\jruby\bin\jruby"
if not exist %JRUBY_BIN% (
  echo "could not find jruby in %LS_HOME%\vendor\jruby" 1>&2
  exit /b 1
)

set RUBYLIB=%LS_HOME%\lib
