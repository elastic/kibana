@echo off

SETLOCAL

set SCRIPT_DIR=%~dp0
for %%I in ("%SCRIPT_DIR%..") do set DIR=%%~dpfI

set NODE=%DIR%\node\node.exe

If Not Exist "%NODE%" (
  Echo unable to find usable node.js executable.
  Exit /B 1
)

TITLE Kibana Keystore
"%NODE%" "%DIR%\src\cli_keystore" %*

:finally

ENDLOCAL
