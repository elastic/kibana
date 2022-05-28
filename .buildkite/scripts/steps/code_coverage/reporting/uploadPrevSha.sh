#!/usr/bin/env bash

set -euo pipefail

collectPrevious() {
    PREVIOUS=$(git log --pretty=format:%h -1)
    echo "### PREVIOUS: ${PREVIOUS}"
    echo $PREVIOUS > previous.txt
}
collectPrevious

gsutil cp previous.txt gs://elastic-bekitzur-kibana-coverage-live/previous_pointer/