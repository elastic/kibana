#! /bin/sh
# -----------------------------------------------------------------------------
# jruby.sh - Start Script for the JRuby interpreter
#
# Environment Variable Prequisites
#
#   JRUBY_OPTS    (Optional) Default JRuby command line args
#   JRUBY_SHELL   Where/What is system shell
#
#   JAVA_HOME     Must point at your Java Development Kit installation.
#
# -----------------------------------------------------------------------------

# ********************************** NOTE *************************************
# This script is provided as a convenience for users on systems that do not
# have the "bash" shell available. It does not support all the flags the bash
# and native executables do, but should be complete enough for most users.
# Improvements are welcome.
# *****************************************************************************

# ----- Verify and Set Required Environment Variables -------------------------

## resolve links - $0 may be a link to  home
PRG=$0
progname=`basename "$0"`

while [ -h "$PRG" ] ; do
  ls=`ls -ld "$PRG"`
  link=`expr -- "$ls" : '.*-> \(.*\)$'`
  if expr -- "$link" : '.*/.*' > /dev/null; then
    if expr -- "$link" : '/' > /dev/null; then
      PRG="$link"
    else
      PRG="`dirname ${PRG}`/${link}"
    fi
  else
    PRG="`dirname $PRG`/$link"
  fi
done

JRUBY_HOME_1=`dirname "$PRG"`           # the ./bin dir
if [ "$JRUBY_HOME_1" = '.' ] ; then
  cwd=`pwd`
  JRUBY_HOME=`dirname $cwd` # JRUBY-2699
else
  JRUBY_HOME=`dirname "$JRUBY_HOME_1"`  # the . dir
fi

if [ -z "$JRUBY_OPTS" ] ; then
  JRUBY_OPTS=""
fi

JRUBY_OPTS_SPECIAL="--ng" # space-separated list of special flags
unset JRUBY_OPTS_TEMP
process_special_opts() {
    case $1 in
        --ng) nailgun_client=true;;
        *) break;;
    esac
}
for opt in ${JRUBY_OPTS}; do
    for special in ${JRUBY_OPTS_SPECIAL}; do
        if [ $opt != $special ]; then
            JRUBY_OPTS_TEMP="${JRUBY_OPTS_TEMP} $opt"
        else
            # make sure flags listed in JRUBY_OPTS_SPECIAL are processed
            case "$opt" in
            --ng)
                process_special_opts $opt;;
            esac
        fi
    done
done
JRUBY_OPTS=${JRUBY_OPTS_TEMP}

if [ -z "$JAVACMD" ] ; then
  if [ -z "$JAVA_HOME" ] ; then
    JAVACMD='java'
  else
    JAVACMD="$JAVA_HOME/bin/java"
  fi
fi

# If you're seeing odd exceptions, you may have a bad JVM install.
# Uncomment this and report the version to the JRuby team along with error.
#$JAVACMD -version

JRUBY_SHELL=/bin/sh

# ----- Set Up The Boot Classpath -------------------------------------------

CP_DELIMITER=":"

# add main jruby jar to the bootclasspath
for j in "$JRUBY_HOME"/lib/jruby.jar "$JRUBY_HOME"/lib/jruby-complete.jar; do
    if [ ! -e "$j" ]; then
      continue
    fi
    if [ "$JRUBY_CP" ]; then
        JRUBY_CP="$JRUBY_CP$CP_DELIMITER$j"
        else
        JRUBY_CP="$j"
    fi
    if [ $JRUBY_ALREADY_ADDED ]; then
        echo "WARNING: more than one JRuby JAR found in lib directory"
    fi
    JRUBY_ALREADY_ADDED=true
done

# ----- Set Up The System Classpath -------------------------------------------

if [ "$JRUBY_PARENT_CLASSPATH" != "" ]; then
    # Use same classpath propagated from parent jruby
    CP=$JRUBY_PARENT_CLASSPATH
else
    # add other jars in lib to CP for command-line execution
    for j in "$JRUBY_HOME"/lib/*.jar; do
        if [ "$j" == "$JRUBY_HOME"/lib/jruby.jar ]; then
          continue
        fi
        if [ "$j" == "$JRUBY_HOME"/lib/jruby-complete.jar ]; then
          continue
        fi
        if [ "$CP" ]; then
            CP="$CP$CP_DELIMITER$j"
            else
            CP="$j"
        fi
    done

fi


# ----- Execute The Requested Command -----------------------------------------

if [ -z "$JAVA_MEM" ] ; then
  JAVA_MEM=-Xmx500m
fi

if [ -z "$JAVA_STACK" ] ; then
  JAVA_STACK=-Xss2048k
fi

if [ -z "$JAVA_VM" ]; then
  JAVA_VM=-client
fi
JAVA_ENCODING=""

#declare -a java_args
#declare -a ruby_args

JAVA_CLASS_JRUBY_MAIN=org.jruby.Main
java_class=$JAVA_CLASS_JRUBY_MAIN
JAVA_CLASS_NGSERVER=com.martiansoftware.nailgun.NGServer

# Split out any -J argument for passing to the JVM.
# Scanning for args is aborted by '--'.
while [ $# -gt 0 ]
do
    case "$1" in
    # Stuff after '-J' in this argument goes to JVM
    -J*)
        val=${1:2}
        if [ "${val:0:4}" = "-Xmx" ]; then
            JAVA_MEM=$val
        elif [ "${val:0:4}" = "-Xss" ]; then
            JAVA_STACK=$val
        elif [ "${val}" = "" ]; then
            $JAVACMD -help
            echo "(Prepend -J in front of these options when using 'jruby' command)" 
            exit
        elif [ "${val}" = "-X" ]; then
            $JAVACMD -X
            echo "(Prepend -J in front of these options when using 'jruby' command)" 
            exit
        elif [ "${val}" = "-classpath" ]; then
            CP="$CP$CP_DELIMITER$2"
            CLASSPATH=""
            shift
        elif [ "${val}" = "-cp" ]; then
            CP="$CP$CP_DELIMITER$2"
            CLASSPATH=""
            shift
        else
            if [ "${val:0:3}" = "-ea" ]; then
                VERIFY_JRUBY="yes"
            elif [ "${val:0:16}" = "-Dfile.encoding=" ]; then
                JAVA_ENCODING=$val
            fi
            java_args="${java_args} ${1:2}"
        fi
        ;;
     # Pass -X... and -X? search options through
     -X*\.\.\.|-X*\?)
        ruby_args="${ruby_args} $1" ;;
     -X+T)
      echo "error: -X+T isn't supported in the shell launcher"
      exit 1
      ;;
     -Xclassic)
      ;;
     # Match -Xa.b.c=d to translate to -Da.b.c=d as a java option
     -X*)
     val=${1:2}
     if expr -- "$val" : '.*[.]' > /dev/null; then
       java_args="${java_args} -Djruby.${val}"
     else
       ruby_args="${ruby_args} -X${val}"
     fi
     ;;
     # Match switches that take an argument
     -C|-e|-I|-S) ruby_args="${ruby_args} $1 $2"; shift ;;
     # Match same switches with argument stuck together
     -e*|-I*|-S*) ruby_args="${ruby_args} $1" ;;
     # Run with JMX management enabled
     --manage)
        java_args="${java_args} -Dcom.sun.management.jmxremote"
        java_args="${java_args} -Djruby.management.enabled=true" ;;
     # Don't launch a GUI window, no matter what
     --headless)
        java_args="${java_args} -Djava.awt.headless=true" ;;
     # Run under JDB
     --jdb)
        if [ -z "$JAVA_HOME" ] ; then
          JAVACMD='jdb'
        else
          JAVACMD="$JAVA_HOME/bin/jdb"
        fi 
        JDB_SOURCEPATH="${JRUBY_HOME}/core/src/main/java:${JRUBY_HOME}/lib/ruby/stdlib:."
        java_args="${java_args} -sourcepath ${JDB_SOURCEPATH}"
        JRUBY_OPTS="${JRUBY_OPTS} -X+C" ;;
     --client)
        JAVA_VM=-client ;;
     --server)
        JAVA_VM=-server ;;
     --noclient)         # JRUBY-4296
        unset JAVA_VM ;; # For IBM JVM, neither '-client' nor '-server' is applicable
     --sample)
        java_args="${java_args} -Xprof" ;;
     --ng-server)
        # Start up as Nailgun server
        java_class=$JAVA_CLASS_NGSERVER
        VERIFY_JRUBY=true ;;
     --no-bootclasspath)
        NO_BOOTCLASSPATH=true ;;
     --ng)
        # Use native Nailgun client to toss commands to server
        process_special_opts "--ng" ;;
     # Abort processing on the double dash
     --) break ;;
     # Other opts go to ruby
     -*) ruby_args="${ruby_args} $1" ;;
     # Abort processing on first non-opt arg
     *) break ;;
    esac
    shift
done

# Force file.encoding to UTF-8 when on Mac, since Apple JDK defaults to MacRoman (JRUBY-3576)
if [[ -z "$JAVA_ENCODING" ]]; then
  java_args="${java_args} -Dfile.encoding=UTF-8"
fi

# Append the rest of the arguments
ruby_args="${ruby_args} $@"

# Put the ruby_args back into the position arguments $1, $2 etc
set -- "${ruby_args}"

JAVA_OPTS="$JAVA_OPTS $JAVA_VM $JAVA_MEM $JAVA_STACK"

JFFI_OPTS="-Djffi.boot.library.path=$JRUBY_HOME/lib/jni"


if [ "$nailgun_client" != "" ]; then
  if [ -f $JRUBY_HOME/tool/nailgun/ng ]; then
    exec $JRUBY_HOME/tool/nailgun/ng org.jruby.util.NailMain $JRUBY_OPTS "$@"
  else
    echo "error: ng executable not found; run 'make' in ${JRUBY_HOME}/tool/nailgun"
    exit 1
  fi
else
if [[ "$NO_BOOTCLASSPATH" != "" || ( "$VERIFY_JRUBY" != "" ) ]]; then
  if [ "$PROFILE_ARGS" != "" ]; then
      echo "Running with instrumented profiler"
  fi

  if [ $java_class = $JAVA_CLASS_NGSERVER -a -n "${JRUBY_OPTS}" ]; then
    echo "warning: starting a nailgun server; discarding JRUBY_OPTS: ${JRUBY_OPTS}"
    JRUBY_OPTS=''
  fi


  "$JAVACMD" $PROFILE_ARGS $JAVA_OPTS "$JFFI_OPTS" ${java_args} -classpath "$JRUBY_CP$CP_DELIMITER$CP$CP_DELIMITER$CLASSPATH" \
    "-Djruby.home=$JRUBY_HOME" \
    "-Djruby.lib=$JRUBY_HOME/lib" -Djruby.script=jruby \
    "-Djruby.shell=$JRUBY_SHELL" \
    $java_class $JRUBY_OPTS $@

  # Record the exit status immediately, or it will be overridden.
  JRUBY_STATUS=$?

  if [ "$PROFILE_ARGS" != "" ]; then
      echo "Profiling results:"
      cat profile.txt
      rm profile.txt
  fi


  exit $JRUBY_STATUS
else
  exec $JAVACMD $JAVA_OPTS $JFFI_OPTS ${java_args} -Xbootclasspath/a:$JRUBY_CP -classpath $CP$CP_DELIMITER$CLASSPATH \
      -Djruby.home=$JRUBY_HOME \
      -Djruby.lib=$JRUBY_HOME/lib -Djruby.script=jruby \
      -Djruby.shell=$JRUBY_SHELL \
      $java_class $JRUBY_OPTS $@
fi
fi

# Be careful adding code down here, you might override the exit
# status of the jruby invocation.
