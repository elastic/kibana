@echo off

SETLOCAL

set SCRIPT_DIR=%~dp0
for %%I in ("%SCRIPT_DIR%..") do set DIR=%%~dpfI

set NODE=%DIR%\node\node.exe
set NODE_ENV="production"

If Not Exist "%NODE%" (
  Echo unable to find usable node.js executable.
  Exit /B 1
)

set "BASE_NODE_OPTIONS=--no-warnings"

set "PARSED_NODE_OPTIONS= %NODE_OPTIONS%"

if "%PARSED_NODE_OPTIONS: =%"=="" (
  set PARSED_NODE_OPTIONS=
)

set "NODE_OPTIONS=%BASE_NODE_OPTIONS%%PARSED_NODE_OPTIONS%"

TITLE Kibana Server
"%NODE%" "%DIR%\src\cli_plugin" %*

:finally

ENDLOCAL
