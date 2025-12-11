#!/bin/bash

# Increase Node.js memory limit for processing large codebase (68k+ files)
# Set up trap to kill all child processes on script exit/crash
trap 'kill $(jobs -p) 2>/dev/null || true; exit' INT TERM EXIT

# Run with increased memory limit
NODE_OPTIONS="--max-old-space-size=8192" node scripts/generate_renovate_codeowners.js "$@"
