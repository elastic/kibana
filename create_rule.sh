curl 'http://localhost:5601/api/detection_engine/rules' \
    --user elastic:changeme \
    -X POST \
    -H 'Content-Type: application/json' \
    -H 'kbn-version: 8.14.0' \
    -H 'elastic-api-version: 2023-10-31' \
    -H 'Origin: http://localhost:5601'  \
    --data '{
          "type": "query",
          "query": "*",
          "index": [
            "apm-*-transaction*",
            "auditbeat-*",
            "endgame-*",
            "filebeat-*",
            "logs-*",
            "packetbeat-*",
            "traces-apm*",
            "winlogbeat-*",
            "-*elastic-cloud-logs-*"
          ],
          "name": "Catch All",
          "description": "The new rule description.",
          "severity": "high",
          "risk_score": 17,
          "interval": "100m",
          "from": "now-50000h"
}'
