#!/bin/sh

SCRIPT=$(readlink -f "${0}")
DIR=$(dirname "${SCRIPT}")

if [ -x "${JAVA_HOME}/bin/java" ]; then
  JAVA="${JAVA_HOME}/bin/java"
else
  JAVA=`which java`
fi

if [ ! -x "${JAVA}" ]; then
  echo "Could not find any executable Java binary. Please install Java in your PATH or set JAVA_HOME"
  exit 1
fi

CONFIG_PATH=${DIR}/../config/kibana.yml RACK_ENV=production exec "${JAVA}" -jar "${DIR}/../lib/kibana.jar"
