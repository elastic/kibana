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

set "NODE_OPTIONS=--no-warnings --max-http-header-size=65536 %NODE_OPTIONS%" && "%NODE%" "%DIR%\src\cli" %*

:finally

ENDLOCAL
