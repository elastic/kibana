#!/bin/bash

echo ""
echo "### benchmark.sh"
echo ""

testName=
testTime=
testPassed=

timestamp() {
  date +"%T"
}

parseLine() {
  if [[ $1 == *"pass"* ]]; then
    testPassed="true"
    # Match milliseconds
    regex="\(([0-9]+)ms\) \"(.*)\""
    if [[ $1 =~ $regex ]]; then
      testTime="${BASH_REMATCH[1]}"
      testName="${BASH_REMATCH[2]}"
      return 1
    fi

    # Match seconds
    regex="\(([0-9]+).([0-9])s\) \"(.*)\""
    if [[ $1 =~ $regex ]]; then
      declare -i timeMath
      timeMath=$((BASH_REMATCH[1] * 1000 + BASH_REMATCH[2] * 100))
      testTime="${timeMath}"
      testName="${BASH_REMATCH[3]}"
      return 1
    fi

    # Match Minutes
    regex="\(([0-9]+).([0-9])m\) \"(.*)\""
    if [[ $1 =~ $regex ]]; then
      declare -i timeMath
      timeMath=$(((BASH_REMATCH[1] * 60 + BASH_REMATCH[2] * 60 / 10) * 1000))
      testTime="${timeMath}"
      testName="${BASH_REMATCH[3]}"
      return 1
    fi
    return
  fi

  if [[ $1 == *"fail"* ]]; then
    regex="fail: \"(.*)\""
    if [[ $1 =~ $regex ]]; then
      testTime=""
      testName="${BASH_REMATCH[1]}"
      testPassed="false"
      return 1
    fi
  fi
}

while getopts u:a:f:r:e:n:x:g:k:t: option; do
  case "${option}" in

  a) APPEND=${OPTARG} ;;
  r) RUNS=${OPTARG} ;;
  x) XPACK=${OPTARG} ;;
  k) KIBANA_DIR=${OPTARG} ;;
  f) FILE=${OPTARG} ;;
  g) GREP=${OPTARG} ;;
  t) THROTTLE=${OPTARG} ;;
  esac
done

printInitVars() {
  echo "### APPEND: ${APPEND}"
  echo "### RUNS: ${RUNS}"
  echo "### FILE: ${FILE}"
  echo "### GREP: ${GREP}"
  echo "### XPACK: ${XPACK}"
  echo "### KIBANA_DIR: ${KIBANA_DIR}"
  echo "### THROTTLE: ${THROTTLE}"
}

throttled="false"
if [ "$THROTTLE" = "true" ]; then
  echo "Throttling is ON"
  throttle="--throttle"
  throttled="true"
  export TEST_THROTTLE_NETWORK=1
else
  echo "Throttling is OFF"
  export TEST_THROTTLE_NETWORK=0
fi

if [ "$KIBANA_DIR" = "" ]; then
  KIBANA_DIR="kibana"
fi

if [ "$FILE" = "" ]; then
  FILE="results.txt"
fi

if [ "$XPACK" = "" ]; then
  XPACK="false"
fi

grepCommand=
echo "grep is ${GREP}"
if [ "$GREP" != "" ]; then
  grepCommand="--grep \"${GREP}\""
  echo "grepCommand is ${grepCommand}"
fi

#cd ../${KIBANA_DIR}
cd ${KIBANA_DIR}
export TEST_BROWSER_HEADLESS=1

if [ "$XPACK" = "false" ]; then
  echo "### Running OSS"
  resultsFile="/home/tre/kibana/src/dev/perf_test/benchmark/${FILE}"
else
  echo "### Running xpack"
  cd ./x-pack
  resultsFile="/home/tre/kibana/src/dev/perf_test/benchmark/${FILE}"
fi

runTestsAndParseLines() {
  counter=1
  echo "Running each test suite $RUNS times"
  while [[ $counter -le $RUNS ]]; do
    echo "RUNNING: node scripts/functional_tests ${grepCommand}"
    eval node ./scripts/functional_tests ${grepCommand} |
      while read CMD; do
        echo $CMD
        parseLine "$CMD"
        if [ "$?" = 1 ]; then
          if [ "$testTime" != "" ]; then
            trackTestTime=" TEST_TIME:${testTime}ms"
          else
            trackTestTime=""
          fi

          if [ "$testName" != "" ]; then
            line="TEST_NAME:\"${testName}\"${trackTestTime} PASSED:${testPassed} THROTTLED:${throttled} ${APPEND}"
            echo "TRACKING: ${line}"
            echo $line >>"$resultsFile"
          fi
        fi
      done
    ((counter++))
  done
}
printInitVars
runTestsAndParseLines

#if [ "$XPACK" = "false" ]; then
#  cd ../benchmark
#else
#  cd ../../benchmark
#fi
