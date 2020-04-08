#!/bin/bash

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

printInitVars() {
  echo "### APPEND: ${APPEND}"
  echo "### RUNS: ${RUNS}"
  echo "### FILE: ${FILE}"
  echo "### GREP: ${GREP}"
  echo "### XPACK: ${XPACK}"
  echo "### KIBANA_DIR: ${KIBANA_DIR}"
  echo "### THROTTLE: ${THROTTLE}"
}

