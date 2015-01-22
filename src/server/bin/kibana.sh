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

DIR=$(dirname "${SCRIPT}")/..
NODE=${DIR}/node/bin/node
SERVER=${DIR}/src/bin/kibana.js

CONFIG_PATH="${DIR}/config/kibana.yml" NODE_ENV="production" exec "${NODE}" ${SERVER} ${@}

