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

TITLE Kibana Server
"%NODE%" %NODE_OPTIONS% --no-warnings "%DIR%\src\cli" %*

:finally

ENDLOCAL
