#!/bin/sh

"$@"
status=$?

if [ ! -z "$TMUX" ] ; then
  if [ "$status" -ne 0 ] ; then
    tmux display-message "Tests Fail"
  else
    tmux display-message "Tests OK"
  fi
fi

exit $status

