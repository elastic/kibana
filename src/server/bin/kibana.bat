@echo off

SETLOCAL

set SCRIPT_DIR=%~dp0
for %%I in ("%SCRIPT_DIR%..") do set DIR=%%~dpfI

set NODE=%DIR%\node\node.exe
set SERVER=%DIR%\src\bin\kibana.js
set NODE_ENV="production"

TITLE Kibana Server @@version

%NODE% %SERVER% --config %DIR%\config\kibana.yml

:finally

ENDLOCAL


