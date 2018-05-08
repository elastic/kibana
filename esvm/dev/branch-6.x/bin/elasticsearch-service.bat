@echo off

setlocal enabledelayedexpansion
setlocal enableextensions

call "%~dp0elasticsearch-env.bat" || exit /b 1

set EXECUTABLE=%ES_HOME%\bin\elasticsearch-service-x64.exe
if "%SERVICE_ID%" == "" set SERVICE_ID=elasticsearch-service-x64
set ARCH=64-bit

if EXIST "%EXECUTABLE%" goto okExe
echo elasticsearch-service-x64.exe was not found...
exit /B 1

:okExe
set ES_VERSION=6.3.0-SNAPSHOT

if "%SERVICE_LOG_DIR%" == "" set SERVICE_LOG_DIR=%ES_HOME%\logs

if "x%1x" == "xx" goto displayUsage
set SERVICE_CMD=%1
shift
if "x%1x" == "xx" goto checkServiceCmd
set SERVICE_ID=%1

:checkServiceCmd

if "%LOG_OPTS%" == "" set LOG_OPTS=--LogPath "%SERVICE_LOG_DIR%" --LogPrefix "%SERVICE_ID%" --StdError auto --StdOutput auto

if /i %SERVICE_CMD% == install goto doInstall
if /i %SERVICE_CMD% == remove goto doRemove
if /i %SERVICE_CMD% == start goto doStart
if /i %SERVICE_CMD% == stop goto doStop
if /i %SERVICE_CMD% == manager goto doManagment
echo Unknown option "%SERVICE_CMD%"

:displayUsage
echo.
echo Usage: elasticsearch-service.bat install^|remove^|start^|stop^|manager [SERVICE_ID]
goto:eof

:doStart
"%EXECUTABLE%" //ES//%SERVICE_ID% %LOG_OPTS%
if not errorlevel 1 goto started
echo Failed starting '%SERVICE_ID%' service
goto:eof
:started
echo The service '%SERVICE_ID%' has been started
goto:eof

:doStop
"%EXECUTABLE%" //SS//%SERVICE_ID% %LOG_OPTS%
if not errorlevel 1 goto stopped
echo Failed stopping '%SERVICE_ID%' service
goto:eof
:stopped
echo The service '%SERVICE_ID%' has been stopped
goto:eof

:doManagment
set EXECUTABLE_MGR=%ES_HOME%\bin\elasticsearch-service-mgr.exe
"%EXECUTABLE_MGR%" //ES//%SERVICE_ID%
if not errorlevel 1 goto managed
echo Failed starting service manager for '%SERVICE_ID%'
goto:eof
:managed
echo Successfully started service manager for '%SERVICE_ID%'.
goto:eof

:doRemove
rem Remove the service
"%EXECUTABLE%" //DS//%SERVICE_ID% %LOG_OPTS%
if not errorlevel 1 goto removed
echo Failed removing '%SERVICE_ID%' service
goto:eof
:removed
echo The service '%SERVICE_ID%' has been removed
goto:eof

:doInstall
echo Installing service      :  "%SERVICE_ID%"
echo Using JAVA_HOME (%ARCH%):  "%JAVA_HOME%"

rem Check JVM server dll first
if exist "%JAVA_HOME%\jre\bin\server\jvm.dll" (
	set JVM_DLL=\jre\bin\server\jvm.dll
	goto foundJVM
)

rem Check 'server' JRE (JRE installed on Windows Server)
if exist "%JAVA_HOME%\bin\server\jvm.dll" (
	set JVM_DLL=\bin\server\jvm.dll
	goto foundJVM
) else (
  	echo JAVA_HOME points to an invalid Java installation (no jvm.dll found in "%JAVA_HOME%"^). Exiting...
  	goto:eof
)

:foundJVM
set ES_JVM_OPTIONS=%ES_PATH_CONF%\jvm.options

if not "%ES_JAVA_OPTS%" == "" set ES_JAVA_OPTS=%ES_JAVA_OPTS: =;%

@setlocal
for /F "usebackq delims=" %%a in (`"%JAVA% -cp "!ES_CLASSPATH!" "org.elasticsearch.tools.launchers.JvmOptionsParser" "!ES_JVM_OPTIONS!" || echo jvm_options_parser_failed"`) do set JVM_OPTIONS=%%a
@endlocal & set "MAYBE_JVM_OPTIONS_PARSER_FAILED=%JVM_OPTIONS%" & set ES_JAVA_OPTS=%JVM_OPTIONS:${ES_TMPDIR}=!ES_TMPDIR!% %ES_JAVA_OPTS%

if "%MAYBE_JVM_OPTIONS_PARSER_FAILED%" == "jvm_options_parser_failed" (
  exit /b 1
)

if not "%ES_JAVA_OPTS%" == "" set ES_JAVA_OPTS=%ES_JAVA_OPTS: =;%

if "%ES_JAVA_OPTS:~-1%"==";" set ES_JAVA_OPTS=%ES_JAVA_OPTS:~0,-1%

echo %ES_JAVA_OPTS%

@setlocal EnableDelayedExpansion
for %%a in ("%ES_JAVA_OPTS:;=","%") do (
  set var=%%a
  if "!var:~1,4!" == "-Xms" (
    set XMS=!var:~5,-1!
    call:convertxm !XMS! JVM_MS
  )
  if "!var:~1,16!" == "-XX:MinHeapSize=" (
    set XMS=!var:~17,-1!
    call:convertxm !XMS! JVM_MS
  )
  if "!var:~1,4!" == "-Xmx" (
    set XMX=!var:~5,-1!
    call:convertxm !XMX! JVM_MX
  )
  if "!var:~1,16!" == "-XX:MaxHeapSize=" (
    set XMX=!var:~17,-1!
    call:convertxm !XMX! JVM_MX
  )
  if "!var:~1,4!" == "-Xss" (
    set XSS=!var:~5,-1!
    call:convertxk !XSS! JVM_SS
  )
  if "!var:~1,20!" == "-XX:ThreadStackSize=" (
    set XSS=!var:~21,-1!
    call:convertxk !XSS! JVM_SS
  )
)
@endlocal & set JVM_MS=%JVM_MS% & set JVM_MX=%JVM_MX% & set JVM_SS=%JVM_SS%

if "%JVM_MS%" == "" (
  echo minimum heap size not set; configure using -Xms via "%ES_JVM_OPTIONS%" or ES_JAVA_OPTS
  goto:eof
)
if "%JVM_MX%" == "" (
  echo maximum heap size not set; configure using -Xmx via "%ES_JVM_OPTIONS%" or ES_JAVA_OPTS
  goto:eof
)
if "%JVM_SS%" == "" (
  echo thread stack size not set; configure using -Xss via "%ES_JVM_OPTIONS%" or ES_JAVA_OPTS
  goto:eof
)

set ES_PARAMS=-Delasticsearch;-Des.path.home="%ES_HOME%";-Des.path.conf="%ES_PATH_CONF%"

if "%ES_START_TYPE%" == "" set ES_START_TYPE=manual
if "%ES_STOP_TIMEOUT%" == "" set ES_STOP_TIMEOUT=0

if "%SERVICE_DISPLAY_NAME%" == "" set SERVICE_DISPLAY_NAME=Elasticsearch %ES_VERSION% (%SERVICE_ID%)
if "%SERVICE_DESCRIPTION%" == "" set SERVICE_DESCRIPTION=Elasticsearch %ES_VERSION% Windows Service - https://elastic.co

if not "%SERVICE_USERNAME%" == "" (
	if not "%SERVICE_PASSWORD%" == "" (
		set SERVICE_PARAMS=%SERVICE_PARAMS% --ServiceUser "%SERVICE_USERNAME%" --ServicePassword "%SERVICE_PASSWORD%"
	)
)

"%EXECUTABLE%" //IS//%SERVICE_ID% --Startup %ES_START_TYPE% --StopTimeout %ES_STOP_TIMEOUT% --StartClass org.elasticsearch.bootstrap.Elasticsearch --StartMethod main ++StartParams --quiet --StopClass org.elasticsearch.bootstrap.Elasticsearch --StopMethod close --Classpath "%ES_CLASSPATH%" --JvmMs %JVM_MS% --JvmMx %JVM_MX% --JvmSs %JVM_SS% --JvmOptions %ES_JAVA_OPTS% ++JvmOptions %ES_PARAMS% %LOG_OPTS% --PidFile "%SERVICE_ID%.pid" --DisplayName "%SERVICE_DISPLAY_NAME%" --Description "%SERVICE_DESCRIPTION%" --Jvm "%%JAVA_HOME%%%JVM_DLL%" --StartMode jvm --StopMode jvm --StartPath "%ES_HOME%" %SERVICE_PARAMS%

if not errorlevel 1 goto installed
echo Failed installing '%SERVICE_ID%' service
goto:eof

:installed
echo The service '%SERVICE_ID%' has been installed.
goto:eof

:err
echo JAVA_HOME environment variable must be set!
pause
goto:eof

rem ---
rem Function for converting Xm[s|x] values into MB which Commons Daemon accepts
rem ---
:convertxm
set value=%~1
rem extract last char (unit)
set unit=%value:~-1%
rem assume the unit is specified
set conv=%value:~0,-1%

if "%unit%" == "k" goto kilo
if "%unit%" == "K" goto kilo
if "%unit%" == "m" goto mega
if "%unit%" == "M" goto mega
if "%unit%" == "g" goto giga
if "%unit%" == "G" goto giga

rem no unit found, must be bytes; consider the whole value
set conv=%value%
rem convert to KB
set /a conv=%conv% / 1024
:kilo
rem convert to MB
set /a conv=%conv% / 1024
goto mega
:giga
rem convert to MB
set /a conv=%conv% * 1024
:mega
set "%~2=%conv%"
goto:eof

:convertxk
set value=%~1
rem extract last char (unit)
set unit=%value:~-1%
rem assume the unit is specified
set conv=%value:~0,-1%

if "%unit%" == "k" goto kilo
if "%unit%" == "K" goto kilo
if "%unit%" == "m" goto mega
if "%unit%" == "M" goto mega
if "%unit%" == "g" goto giga
if "%unit%" == "G" goto giga

rem no unit found, must be bytes; consider the whole value
set conv=%value%
rem convert to KB
set /a conv=%conv% / 1024
goto kilo
:mega
rem convert to KB
set /a conv=%conv% * 1024
goto kilo
:giga
rem convert to KB
set /a conv=%conv% * 1024 * 1024
:kilo
set "%~2=%conv%"
goto:eof

endlocal
endlocal
