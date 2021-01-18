@echo off

SETLOCAL ENABLEDELAYEDEXPANSION

set SCRIPT_DIR=%~dp0
for %%I in ("%SCRIPT_DIR%..") do set DIR=%%~dpfI

set NODE=%DIR%\node\node.exe

set NODE_ENV="production"

If Not Exist "%NODE%" (
  Echo unable to find usable node.js executable.
  Exit /B 1
)

set CONFIG_DIR=%KBN_PATH_CONF%
If [%KBN_PATH_CONF%] == [] (
  set "CONFIG_DIR=%DIR%\config"
)

IF EXIST "%CONFIG_DIR%\node.options" (
  for /F "usebackq eol=# tokens=*" %%i in ("%CONFIG_DIR%\node.options") do (
    If [!NODE_OPTIONS!] == [] (
      set "NODE_OPTIONS=%%i"
    )	Else (
      set "NODE_OPTIONS=!NODE_OPTIONS! %%i"
    )
  )
)

:: Include pre-defined node option
set "NODE_OPTIONS=--no-warnings --max-http-header-size=65536 %NODE_OPTIONS%"

:: This should run independently as the last instruction
:: as we need NODE_OPTIONS previously set to expand
"%NODE%" "%DIR%\src\cli\dist" %*

:finally

ENDLOCAL
