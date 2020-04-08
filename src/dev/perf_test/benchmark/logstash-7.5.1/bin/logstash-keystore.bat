@echo off
setlocal enabledelayedexpansion

call "%~dp0setup.bat" || exit /b 1
if errorlevel 1 (
	if not defined nopauseonerror (
		pause
	)
	exit /B %ERRORLEVEL%
)

%JRUBY_BIN% "%LS_HOME%\lib\secretstore\cli.rb" %*
if errorlevel 1 (
  exit /B 1
)

endlocal
