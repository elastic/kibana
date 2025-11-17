#!/bin/bash

for i in {1..30}
do
   UUID=$(uuidgen | cut -c 1-6)
   curl --location 'http://localhost:5601/api/observability/slos' \
   --header 'Content-Type: application/json' \
   --header 'kbn-xsrf: oui' \
   --header 'Authorization: Basic ZWxhc3RpYzpjaGFuZ2VtZQ==' \
   --data-raw '{
       "name": "Request Health '$UUID'",
       "description": "",
       "indicator": {
           "type": "sli.kql.custom",
           "params": {
               "index": "kbn-data-forge-fake_stack.admin-console-*",
               "filter": "",
               "good": "http.request.bytes < 100",
               "total": "",
               "timestampField": "@timestamp",
               "dataViewId": "e7744dbe-a7a4-457b-83aa-539e9c88764c"
           }
       },
       "budgetingMethod": "occurrences",
       "timeWindow": {
           "duration": "30d",
           "type": "rolling"
       },
       "objective": {
           "target": 0.99
       },
       "tags": [],
       "groupBy": [
           "*"
       ],
       "settings": {
           "preventInitialBackfill": false,
           "syncDelay": "1m",
           "frequency": "1m",
           "syncField": null
       }
   }' &
done

wait
echo "100 requests sent."

