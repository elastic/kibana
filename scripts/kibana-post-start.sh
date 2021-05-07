#!/usr/bin/bash
KIBANA_STARTUP_LOG=/var/log/probe/KibanaStartup.log

# Wait for KIBANA to become reachable
echo "[INFO] Waiting for Kibana to become reachable" >> $KIBANA_STARTUP_LOG
until /usr/bin/curl -I -XGET http://localhost:5601/analyze/status 2>/dev/null | grep -q "200"
do
   /usr/bin/sleep 1
done
echo "[INFO] Kibana is reachable and returned a 200 status" >> $KIBANA_STARTUP_LOG

# Call script to clean up old .kibana_* indices
python /usr/local/kibana-7.5.2-linux-x64/scripts/rmOldKibanaIndices.py
