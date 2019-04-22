#!/bin/bash

EMAIL=$(git config --system user.email)
NAME=$(git config --system user.name)
if test -z "$EMAIL" || test -z "$NAME"
then
      echo ".gitconfig must be mounted"
      exit 1
else
      backport "$@"
fi
