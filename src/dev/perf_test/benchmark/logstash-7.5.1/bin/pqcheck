#!/usr/bin/env bash

unset CDPATH
# This unwieldy bit of scripting is to try to catch instances where Logstash
# was launched from a symlink, rather than a full path to the Logstash binary
if [ -L "$0" ]; then
  # Launched from a symlink
  # --Test for the readlink binary
  RL="$(command -v readlink)"
  if [ $? -eq 0 ]; then
    # readlink exists
    SOURCEPATH="$(${RL} $0)"
  else
    # readlink not found, attempt to parse the output of stat
    SOURCEPATH="$(stat -c %N $0 | awk '{print $3}' | sed -e 's/\‘//' -e 's/\’//')"
    if [ $? -ne 0 ]; then
      # Failed to execute or parse stat
      echo "Failed to find source library at path $(cd `dirname $0`/..; pwd)/bin/logstash.lib.sh"
      echo "You may need to launch Logstash with a full path instead of a symlink."
      exit 1
    fi
  fi
else
  # Not a symlink
  SOURCEPATH="$0"
fi

. "$(cd `dirname ${SOURCEPATH}`/..; pwd)/bin/logstash.lib.sh"
setup

unset CLASSPATH
for J in $(cd "${LOGSTASH_JARS}"; ls *.jar); do
  CLASSPATH=${LOGSTASH_JARS}/${J}:${CLASSPATH}
done
exec "${JAVACMD}" ${JAVA_OPTS} -cp "${CLASSPATH}" org.logstash.ackedqueue.PqCheck "$@"
