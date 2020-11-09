#!/bin/sh
set -e

# source the default env file
if [ -f "<%= envFile %>" ]; then
    . "<%= envFile %>"
fi

export KBN_PATH_CONF=${KBN_PATH_CONF:-<%= configDir %>}

set_chmod() {
  chmod -f 660 ${KBN_PATH_CONF}/kibana.yml || true
  chmod -f 2750 <%= dataDir %> || true
  chmod -f 2750 ${KBN_PATH_CONF} || true
  chmod -f 2750 <%= logDir %> || true
}

set_chown() {
  chown <%= user %>:<%= group %> <%= logDir %>
  chown -R <%= user %>:<%= group %> <%= dataDir %>
  chown -R root:<%= group %> ${KBN_PATH_CONF}
}

setup() {
  [ ! -d "<%= logDir %>" ] && mkdir "<%= logDir %>"
  set_chmod
  set_chown
}

case $1 in
  # Debian
  configure)
    if ! getent group "<%= group %>" >/dev/null; then
      addgroup --quiet --system "<%= group %>"
    fi

    if ! getent passwd "<%= user %>" >/dev/null; then
      adduser --quiet --system --no-create-home --disabled-password \
      --ingroup "<%= group %>" --shell /bin/false "<%= user %>"
    fi

    if [ -n "$2" ]; then
      IS_UPGRADE=true
    fi

    setup
  ;;
  abort-deconfigure|abort-upgrade|abort-remove)
  ;;

  # Red Hat
  1|2)
    if ! getent group "<%= group %>" >/dev/null; then
      groupadd -r "<%= group %>"
    fi

    if ! getent passwd "<%= user %>" >/dev/null; then
      useradd -r -g "<%= group %>" -M -s /sbin/nologin \
      -c "kibana service user" "<%= user %>"
    fi

    if [ "$1" = "2" ]; then
      IS_UPGRADE=true
    fi

    setup
  ;;

  *)
      echo "post install script called with unknown argument \`$1'" >&2
      exit 1
  ;;
esac

if [ "$IS_UPGRADE" = "true" ]; then
  if command -v systemctl >/dev/null; then
      systemctl daemon-reload
  fi

  if [ "$RESTART_ON_UPGRADE" = "true" ]; then
    echo -n "Restarting kibana service..."
    if command -v systemctl >/dev/null; then
        systemctl restart kibana.service || true
    fi
    echo " OK"
  fi
fi
