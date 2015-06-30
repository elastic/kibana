@echo off

SETLOCAL

set SCRIPT_DIR=%~dp0
for %%I in ("%SCRIPT_DIR%..") do set DIR=%%~dpfI

set NODE=%DIR%\node\node.exe
set SERVER=%DIR%\src\bin\kibana.js
set NODE_ENV="production"
set CONFIG_PATH=%DIR%\config\kibana.yml
REM set NPM (TODO: Need to define the env variable to the install of npm. TALK TO CHRIS/JOE)

TITLE Kibana Server @@version

"%NODE%" "%SERVER%" %*

:finally

ENDLOCAL