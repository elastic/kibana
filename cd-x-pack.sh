#!/usr/bin/env bash

cd x-pack 2> /dev/null
exitCode=$?
if [ $exitCode -ne 0 ]; then
    echo "can't cd into x-pack, you're prolly in the wrong directory"
    exit 1
fi

$*