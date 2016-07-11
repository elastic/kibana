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

for /F "eol=# tokens=*" %%i in (%DIR%\config\node.options) do (
  If [%NODE_OPTIONS%]==[] (
    set NODE_OPTIONS="%%i"
  )
  else (
    set NODE_OPTIONS="%%i %NODE_OPTIONS"
  )
)

TITLE Kibana Server
"%NODE%" "%DIR%\src\cli_plugin" %*

:finally

ENDLOCAL
