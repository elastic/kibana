#!/bin/sh
set -e

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
  ;;
  abort-deconfigure|abort-upgrade|abort-remove)
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
              "<%= user %>" \
      echo " OK"
    fi
  ;;

  *)
    echo "post install script called with unknown argument \`$1'" >&2
    exit 1
  ;;
esac

chown <%= user %>:<%= group %> <%= optimizeDir %>
chown <%= user %>:<%= group %> <%= pluginsDir %>
chown -R <%= user %>:<%= group %> <%= configDir %>
chown -R <%= user %>:<%= group %> <%= dataDir %>
