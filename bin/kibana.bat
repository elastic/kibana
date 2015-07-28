@echo off

SETLOCAL

set SCRIPT_DIR=%~dp0
for %%I in ("%SCRIPT_DIR%..") do set DIR=%%~dpfI

set NODE=%DIR%\node\node.exe
for /f "delims=" %%i in ('WHERE node') do set SYS_NODE=%%i

If Not Exist "%NODE%" (
  IF Exist "%SYS_NODE%" (
    set NODE=%SYS_NODE%
  ) else (
    Echo unable to find usable node.js executable.
    Exit /B 1
  )
)

TITLE Kibana Server
"%NODE%" "%DIR%\src\cli\cli" %*

:finally

ENDLOCAL