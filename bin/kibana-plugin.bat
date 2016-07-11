@echo off

SETLOCAL

set SCRIPT_DIR=%~dp0
for %%I in ("%SCRIPT_DIR%..") do set DIR=%%~dpfI

set NODE=%DIR%\node\node.exe

WHERE /Q node
IF %ERRORLEVEL% EQU 0 (
  for /f "delims=" %%i in ('WHERE node') do set SYS_NODE=%%i
)

If Not Exist "%NODE%" (
  IF Exist "%SYS_NODE%" (
    set "NODE=%SYS_NODE%"
  ) else (
    Echo unable to find usable node.js executable.
    Exit /B 1
  )
)

for /F "eol=# tokens=*" %%i in (%DIR%\config\node.options) do (
  If [%NODE_OPTIONS%]==[] (
    set NODE_OPTIONS="%%i"
  )
  else (
    set NODE_OPTIONS="%NODE_OPTIONS %%i"
  )
)

TITLE Kibana Server
"%NODE%" %NODE_OPTIONS% "%DIR%\src\cli_plugin" %*

:finally

ENDLOCAL
