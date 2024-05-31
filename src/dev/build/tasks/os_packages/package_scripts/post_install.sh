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
  chown <%= user %>:<%= group %> <%= pidDir %>
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
    if ! getent group "<%= group %>" >/dev/null 2>&1 ; then
      echo -n "Creating <%= group %> group..."
      addgroup --quiet --system "<%= group %>"
      echo " OK"
    fi

    if ! id "<%= user %>" >/dev/null 2>&1 ; then
      echo -n "Creating <%= user %> user..."
      adduser --quiet \
              --system \
              --no-create-home \
              --home /nonexistent \
              --ingroup "<%= group %>" \
              --disabled-password \
              --shell /bin/false \
              "<%= user %>"
      echo " OK"
    fi

    if [ -n "$2" ]; then
      IS_UPGRADE=true
    fi

    PACKAGE=deb
    setup
  ;;
  abort-deconfigure|abort-upgrade|abort-remove)
    PACKAGE=deb
  ;;

  # Red Hat
  1|2)
    if ! getent group "<%= group %>" >/dev/null 2>&1 ; then
      echo -n "Creating <%= group %> group..."
      groupadd -r "<%= group %>"
      echo " OK"
    fi

    if ! id "<%= user %>" >/dev/null 2>&1 ; then
      echo -n "Creating <%= user %> user..."
      useradd --system \
              --no-create-home \
              --home-dir /nonexistent \
              --gid "<%= group %>" \
              --shell /sbin/nologin \
              --comment "kibana service user" \
              "<%= user %>"
      echo " OK"
    fi

    if [ "$1" = "2" ]; then
      IS_UPGRADE=true
    fi

    PACKAGE=rpm
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

# the equivalent code for rpm is in posttrans
if [ "$PACKAGE" = "deb" ]; then
  if [ ! -f "${KBN_PATH_CONF}"/kibana.keystore ]; then
      /usr/share/kibana/bin/kibana-keystore create
      chown root:<%= group %> "${KBN_PATH_CONF}"/kibana.keystore
      chmod 660 "${KBN_PATH_CONF}"/kibana.keystore
  fi
fi
