#!/bin/bash

# If FIPS mode is enabled, there can be issues installing some dependencies due to invalid algorithms.
# So override the NODE_OPTIONS environment variable to disable FIPS mode.
NODE_OPTIONS='' yarn kbn bootstrap

Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
