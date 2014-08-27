@echo off

SETLOCAL
if NOT DEFINED JAVA_HOME goto java_home_err

set SCRIPT_DIR=%~dp0
for %%I in ("%SCRIPT_DIR%..") do set DIR=%%~dpfI

set RACK_ENV=production
set CONFIG_PATH=%DIR%\config\kibana.yml


TITLE Kibana 4.0.0-BETA

"%JAVA_HOME%\bin\java" -jar "%DIR%\lib\kibana.jar" %*

:java_home_err
echo JAVA_HOME enviroment variable must be set!
pause

:finally

ENDLOCAL
