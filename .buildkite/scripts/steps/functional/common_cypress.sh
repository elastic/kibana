#!/usr/bin/env bash

Xvfb -screen 0 1680x946x24 :99 &
export DISPLAY=:99
export CYPRESS_NO_COMMAND_LOG=1
