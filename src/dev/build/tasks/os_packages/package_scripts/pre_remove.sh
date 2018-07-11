#!/bin/sh
set -e

stop() {
  echo -n "Stopping kibana service..."
  if command -v systemctl >/dev/null && systemctl is-active kibana.service >/dev/null; then
      systemctl --no-reload stop kibana.service
  elif [ -x /etc/init.d/kibana ]; then
      if command -v invoke-rc.d >/dev/null; then
          invoke-rc.d kibana stop
      elif command -v service >/dev/null; then
          service kibana stop
      else
          /etc/init.d/kibana stop
      fi
  fi
  echo " OK"
}

case "$1" in

    # deb
    remove)
      stop
    ;;

    upgrade|deconfigure|failed-upgrade)
    ;;

    # rpm
    0)
      stop
    ;;
    1)
    ;;

    *)
        echo "pre remove script called with unknown argument \`$1'" >&2
        exit 1
    ;;
esac
