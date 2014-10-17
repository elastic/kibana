@echo off

SETLOCAL
if not defined JAVA_HOME goto java_home_err

set SCRIPT_DIR=%~dp0
for %%I in ("%SCRIPT_DIR%..") do set DIR=%%~dpfI

set RACK_ENV=production
set CONFIG_PATH=%DIR%\config\kibana.yml
set PLUGINS_FOLDER=%DIR%\plugins
set KIBANA_VERSION=@@version


TITLE Kibana %KIBANA_VERSION%

"%JAVA_HOME%\bin\java" -jar "%DIR%\lib\kibana.jar" %*

:java_home_err
echo JAVA_HOME enviroment variable must be set!
pause
goto finally

:finally

ENDLOCAL
