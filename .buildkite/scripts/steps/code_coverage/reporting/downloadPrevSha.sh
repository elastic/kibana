#!/usr/bin/env bash

set -euo pipefail

gsutil -m cp -r gs://elastic-bekitzur-kibana-coverage-live/previous_pointer/previous.txt . || echo "### Previous Pointer NOT FOUND?"

if [ -e ./previous.txt ]; then
    mv previous.txt downloaded_previous.txt
    echo "### downloaded_previous.txt"
    cat downloaded_previous.txt
fi