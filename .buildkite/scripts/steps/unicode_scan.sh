#!/usr/bin/env bash

set -euo pipefail

docker run -v "$(pwd)":/app -w /app --rm -t python:3 python3 .buildkite/scripts/steps/unicode_scan.py .
