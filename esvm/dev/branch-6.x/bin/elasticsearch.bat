@echo off

setlocal enabledelayedexpansion
setlocal enableextensions

SET params='%*'

:loop
FOR /F "usebackq tokens=1* delims= " %%A IN (!params!) DO (
    SET current=%%A
    SET params='%%B'
	SET silent=N

	IF "!current!" == "-s" (
		SET silent=Y
	)
	IF "!current!" == "--silent" (
		SET silent=Y
	)

	IF "!silent!" == "Y" (
		SET nopauseonerror=Y
	) ELSE (
	    IF "x!newparams!" NEQ "x" (
	        SET newparams=!newparams! !current!
        ) ELSE (
            SET newparams=!current!
        )
	)

    IF "x!params!" NEQ "x" (
		GOTO loop
	)
)

CALL "%~dp0elasticsearch-env.bat" || exit /b 1
IF ERRORLEVEL 1 (
	IF NOT DEFINED nopauseonerror (
		PAUSE
	)
	EXIT /B %ERRORLEVEL%
)

set "ES_JVM_OPTIONS=%ES_PATH_CONF%\jvm.options"
@setlocal
for /F "usebackq delims=" %%a in (`"%JAVA% -cp "!ES_CLASSPATH!" "org.elasticsearch.tools.launchers.JvmOptionsParser" "!ES_JVM_OPTIONS!" || echo jvm_options_parser_failed"`) do set JVM_OPTIONS=%%a
@endlocal & set "MAYBE_JVM_OPTIONS_PARSER_FAILED=%JVM_OPTIONS%" & set ES_JAVA_OPTS=%JVM_OPTIONS:${ES_TMPDIR}=!ES_TMPDIR!% %ES_JAVA_OPTS%

if "%MAYBE_JVM_OPTIONS_PARSER_FAILED%" == "jvm_options_parser_failed" (
  exit /b 1
)

cd /d "%ES_HOME%"
%JAVA% %ES_JAVA_OPTS% -Delasticsearch -Des.path.home="%ES_HOME%" -Des.path.conf="%ES_PATH_CONF%" -cp "%ES_CLASSPATH%" "org.elasticsearch.bootstrap.Elasticsearch" !newparams!

endlocal
endlocal
