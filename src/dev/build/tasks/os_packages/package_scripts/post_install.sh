#!/bin/sh
set -e

try-restart() {
  if command -v systemctl >/dev/null ; then
      systemctl daemon-reload
      systemctl try-restart kibana.service
  elif [ -x /etc/init.d/kibana ]; then
      if command -v invoke-rc.d >/dev/null; then
          invoke-rc.d kibana try-restart
      elif command -v service >/dev/null; then
          service kibana try-restart
      else
          /etc/init.d/kibana try-restart
      fi
  fi
}

case $1 in
  # deb
  configure)
    if ! getent group "<%= group %>" >/dev/null; then
      addgroup --quiet --system "<%= group %>"
    fi

    if ! getent passwd "<%= user %>" >/dev/null; then
      adduser --quiet --system --no-create-home --disabled-password \
      --ingroup "<%= group %>" --shell /bin/false "<%= user %>"
    fi

    # upgrade
    if [ -n "$2" ]
      try-restart
    fi
  ;;
  abort-deconfigure|abort-upgrade|abort-remove)
  ;;

  # rpm
  1|2)
    if ! getent group "<%= group %>" >/dev/null; then
      groupadd -r "<%= group %>"
    fi

    if ! getent passwd "<%= user %>" >/dev/null; then
      useradd -r -g "<%= group %>" -M -s /sbin/nologin \
      -c "kibana service user" "<%= user %>"
    fi

    # upgrade
    if [ "$1" = "2"]
      try-restart
    fi
  ;;

  *)
      echo "post install script called with unknown argument \`$1'" >&2
      exit 1
  ;;
esac

chown -R <%= user %>:<%= group %> <%= optimizeDir %>
chown <%= user %>:<%= group %> <%= dataDir %>
chown <%= user %>:<%= group %> <%= pluginsDir %>
