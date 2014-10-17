#!/bin/sh

SCRIPT=$0

# SCRIPT may be an arbitrarily deep series of symlinks. Loop until we have the concrete path.
while [ -h "$SCRIPT" ] ; do
  ls=$(ls -ld "$SCRIPT")
  # Drop everything prior to ->
  link=$(expr "$ls" : '.*-> \(.*\)$')
  if expr "$link" : '/.*' > /dev/null; then
    SCRIPT="$link"
  else
    SCRIPT=$(dirname "$SCRIPT")/"$link"
  fi
done

DIR=$(dirname "${SCRIPT}")

if [ -x "${JAVA_HOME}/bin/java" ]; then
  JAVA="${JAVA_HOME}/bin/java"
else
  JAVA=$(which java)
fi

if [ ! -x "${JAVA}" ]; then
  echo "Could not find any executable Java binary. Please install Java in your PATH or set JAVA_HOME"
  exit 1
fi
>&2 echo "The Kibana Backend is starting up... be patient"

JAVA_OPTS="-Xmx512m $JAVA_OPTS"

# Clear gem paths so that we only use the gems inside the kibana.jar
export GEM_HOME=
export GEM_PATH=

# shellcheck disable=SC2086
KIBANA_VERSION=@@version \
  CONFIG_PATH=${DIR}/../config/kibana.yml \
  PLUGINS_FOLDER=${DIR}/../plugins \
  RACK_ENV=production \
  exec "${JAVA}" \
  $JAVA_OPTS \
  -jar "${DIR}/../lib/kibana.jar" "$@"