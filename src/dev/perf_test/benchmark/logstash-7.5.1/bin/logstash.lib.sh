# This script is used to initialize a number of env variables and setup the
# runtime environment of logstash. It sets to following env variables:
#   LOGSTASH_HOME & LS_HOME
#   SINCEDB_DIR
#   JAVACMD
#   JAVA_OPTS
#   GEM_HOME & GEM_PATH
#   DEBUG
#
# These functions are provided for the calling script:
#   setup() to setup the environment
#   ruby_exec() to execute a ruby script with using the setup runtime environment
#
# The following env var will be used by this script if set:
#   LS_GEM_HOME and LS_GEM_PATH to overwrite the path assigned to GEM_HOME and GEM_PATH
#   LS_JAVA_OPTS to append extra options to the JVM options provided by logstash
#   JAVA_HOME to point to the java home

unset CDPATH
# This unwieldy bit of scripting is to try to catch instances where Logstash
# was launched from a symlink, rather than a full path to the Logstash binary
if [ -L "$0" ]; then
  # Launched from a symlink
  # --Test for the readlink binary
  RL="$(command -v readlink)"
  if [ $? -eq 0 ]; then
    # readlink exists
    SOURCEPATH="$($RL $0)"
  else
    # readlink not found, attempt to parse the output of stat
    SOURCEPATH="$(stat -c %N $0 | awk '{print $3}' | sed -e 's/\‘//' -e 's/\’//')"
    if [ $? -ne 0 ]; then
      # Failed to execute or parse stat
      echo "Failed to set LOGSTASH_HOME from $(cd `dirname $0`/..; pwd)/bin/logstash.lib.sh"
      echo "You may need to launch Logstash with a full path instead of a symlink."
      exit 1
    fi
  fi
else
  # Not a symlink
  SOURCEPATH="$0"
fi

LOGSTASH_HOME="$(cd `dirname $SOURCEPATH`/..; pwd)"
export LOGSTASH_HOME
export LS_HOME="${LOGSTASH_HOME}"
SINCEDB_DIR="${LOGSTASH_HOME}"
export SINCEDB_DIR
LOGSTASH_JARS=${LOGSTASH_HOME}/logstash-core/lib/jars

# iterate over the command line args and look for the argument
# after --path.settings to see if the jvm.options file is in
# that path and set LS_JVM_OPTS accordingly
# This fix is for #6379
unset LS_JVM_OPTS
found=0
for i in "$@"; do
 if [ $found -eq 1 ]; then
   if [ -r "${i}/jvm.options" ]; then
     export LS_JVM_OPTS="${i}/jvm.options"
     break
   fi
 fi
 if [ "$i" = "--path.settings" ]; then
   found=1
 fi
done

parse_jvm_options() {
  if [ -f "$1" ]; then
    echo "$(grep "^-" "$1" | tr '\n' ' ')"
  fi
}

setup_java() {
  # set the path to java into JAVACMD which will be picked up by JRuby to launch itself
  if [ -z "$JAVACMD" ]; then
    if [ -x "$JAVA_HOME/bin/java" ]; then
      JAVACMD="$JAVA_HOME/bin/java"
    else
      set +e
      JAVACMD=`command -v java`
      set -e
    fi
  fi

  if [ ! -x "$JAVACMD" ]; then
    echo "could not find java; set JAVA_HOME or ensure java is in PATH"
    exit 1
  fi

  # do not let JAVA_TOOL_OPTIONS slip in (as the JVM does by default)
  if [ ! -z "$JAVA_TOOL_OPTIONS" ]; then
    echo "warning: ignoring JAVA_TOOL_OPTIONS=$JAVA_TOOL_OPTIONS"
    unset JAVA_TOOL_OPTIONS
  fi

  # JAVA_OPTS is not a built-in JVM mechanism but some people think it is so we
  # warn them that we are not observing the value of $JAVA_OPTS
  if [ ! -z "$JAVA_OPTS" ]; then
    echo -n "warning: ignoring JAVA_OPTS=$JAVA_OPTS; "
    echo "pass JVM parameters via LS_JAVA_OPTS"
  fi

  # Set a default GC log file for use by jvm.options _before_ it's called.
  if [ -z "$LS_GC_LOG_FILE" ] ; then
    LS_GC_LOG_FILE="./logstash-gc.log"
  fi

  # Set the initial JVM options from the jvm.options file.  Look in
  # /etc/logstash first, and break if that file is found readable there.
  if [ -z "$LS_JVM_OPTS" ]; then
      for jvm_options in /etc/logstash/jvm.options \
                        "$LOGSTASH_HOME"/config/jvm.options;
                         do
          if [ -r "$jvm_options" ]; then
              LS_JVM_OPTS=$jvm_options
              break
          fi
      done
  fi
  # then override with anything provided
  LS_JAVA_OPTS="$(parse_jvm_options "$LS_JVM_OPTS") $LS_JAVA_OPTS"
  JAVA_OPTS=$LS_JAVA_OPTS

  # jruby launcher uses JAVACMD as its java executable and JAVA_OPTS as the JVM options
  export JAVACMD
  export JAVA_OPTS
}

setup_vendored_jruby() {
  JRUBY_BIN="${LOGSTASH_HOME}/vendor/jruby/bin/jruby"

  if [ ! -f "${JRUBY_BIN}" ] ; then
    echo "Unable to find JRuby."
    echo "If you are a user, this is a bug."
    echo "If you are a developer, please run 'rake bootstrap'. Running 'rake' requires the 'ruby' program be available."
    exit 1
  fi

  if [ -z "$LS_GEM_HOME" ] ; then
    export GEM_HOME="${LOGSTASH_HOME}/vendor/bundle/jruby/2.5.0"
  else
    export GEM_HOME=${LS_GEM_HOME}
  fi
  if [ "$DEBUG" ] ; then
    echo "Using GEM_HOME=${GEM_HOME}"
  fi

  if [ -z "$LS_GEM_PATH" ] ; then
    export GEM_PATH=${GEM_HOME}
  else
    export GEM_PATH=${LS_GEM_PATH}
  fi
  if [ "$DEBUG" ] ; then
    echo "Using GEM_PATH=${GEM_PATH}"
  fi
}

setup() {
  setup_java
  setup_vendored_jruby
}

ruby_exec() {
  if [ "$DEBUG" ] ; then
    echo "DEBUG: exec ${JRUBY_BIN} $@"
  fi
  exec "${JRUBY_BIN}" "$@"
}
