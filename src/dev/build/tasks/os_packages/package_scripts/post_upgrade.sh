#!/bin/sh
set -e

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
