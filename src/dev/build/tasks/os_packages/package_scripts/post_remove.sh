#!/bin/sh
set -e

REMOVE_DIRS=false
REMOVE_USER_AND_GROUP=false

case $1 in
  # Includes cases for all valid arguments, exit 1 otherwise
  # Debian
  purge)
    REMOVE_DIRS=true
    REMOVE_USER_AND_GROUP=true
  ;;
  remove)
    REMOVE_DIRS=true
  ;;

  failed-upgrade|abort-install|abort-upgrade|disappear|upgrade|disappear)
  ;;

  # Red Hat
  0)
    REMOVE_USER_AND_GROUP=true
    REMOVE_DIRS=true
  ;;

  1)
  ;;

  *)
    echo "post remove script called with unknown argument \`$1'" >&2
    exit 1
  ;;
esac

if [ "$REMOVE_DIRS" = "true" ]; then
  if [ -d "<%= pluginsDir %>" ]; then
    echo -n "Deleting plugins directory..."
    rm -rf "<%= pluginsDir %>"
    echo " OK"
  fi

  if [ -d "<%= configDir %>" ]; then
    rmdir --ignore-fail-on-non-empty "<%= configDir %>"
  fi

  if [ -d "<%= dataDir %>" ]; then
    rmdir --ignore-fail-on-non-empty "<%= dataDir %>"
  fi
fi

if [ "$REMOVE_USER_AND_GROUP" = "true" ]; then
  if getent passwd "<%= user %>" >/dev/null 2>&1 ; then
    echo -n "Deleting <%= user %> user..."
    userdel "<%= user %>"
    echo " OK"
  fi

  if getent group "<%= group %>" >/dev/null 2>&1 ; then
    echo -n "Deleting <%= group %> group..."
    groupdel "<%= group %>"
    echo " OK"
  fi
fi
