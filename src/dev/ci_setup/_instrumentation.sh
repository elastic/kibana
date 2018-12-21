#!/usr/bin/env bash

function ici_span_start {
  if [ "$INSTRUMENT_CI" != "" ]; then
    echo -n "%%ICI%%{\"span_start\":\"$1\"}%%ICI%%"
  fi
}

function ici_span_stop {
  if [ "$INSTRUMENT_CI" != "" ]; then
    echo -n "%%ICI%%{\"span_stop\":\"$1\"}%%ICI%%"
  fi
}
