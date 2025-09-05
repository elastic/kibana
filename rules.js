/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const https = require('https');
const http = require('http');

const concurrency = 76 * 10;
const total = 8000;

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});
const httpAgent = new http.Agent({});

let numRequestsRemaining = total;
for (let i = 0; i < concurrency; i++) {
  (async () => {
    while (numRequestsRemaining > 0) {
      numRequestsRemaining--;
      await new Promise((resolve) => {
        const req = https.request(
          {
            protocol: 'https:',
            host: 'kibana-pr-233426.kb.us-west2.gcp.elastic-cloud.com',
            // port: 9243,
            path: '/api/alerting/rule',
            method: 'POST',
            agent: httpsAgent,
            headers: {
              Authorization:
                'Basic ' + Buffer.from('elastic:QiFJT2TmZOCETQlyon1jszKX').toString('base64'),
              // 'Authorization': `ApiKey V3NzZUs0OEJIcmprbVpOOFo2UzY6aTNaX3kxbnBTYTZmeDZwZENLR2xVZw==`,
              'Content-Type': 'application/json',
              'kbn-xsrf': 'true',
              'x-elastic-internal-origin': 'kibana',
            },
          },
          function (res) {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk;
              {
              }
            });
            res.on('end', () => {
              if (res.statusCode !== 200) {
                console.error(`Received ${res.statusCode} - ${data}`);
              }
              resolve();
            });
          }
        );

        /*const req = http.request({
                    protocol: 'http:',
                    host: 'localhost',
                    port: 5601,
                    path: '/api/alerting/rule',
                    method: 'POST',
                    agent: httpAgent,
                    headers: {
                        'Authorization': 'Basic ' + Buffer.from('elastic:changeme').toString('base64'),
                        // 'Authorization': `ApiKey V3NzZUs0OEJIcmprbVpOOFo2UzY6aTNaX3kxbnBTYTZmeDZwZENLR2xVZw==`,
                        'Content-Type': 'application/json',
                        'kbn-xsrf': 'true',
                        'x-elastic-internal-origin': 'kibana'
                    }
                }, function (res) {
                    let data = '';
                    res.on('data', (chunk) => {
                        data += chunk;{}
                    });
                    res.on('end', () => {
                        if (res.statusCode !== 200) {
                            console.error(`Received ${res.statusCode} - ${data}`);
                        }
                        resolve();
                    })
                });*/

        req.write(
          JSON.stringify({
            enabled: true,
            name: 'test',
            rule_type_id: '.es-query',
            consumer: 'stackAlerts',
            schedule: { interval: '1m' },
            actions: [],
            params: {
              aggType: 'count',
              esQuery: '{\n    "query":{\n      "match_all" : {}\n    }\n  }',
              excludeHitsFromPreviousRun: false,
              groupBy: 'all',
              searchType: 'esQuery',
              size: 100,
              sourceFields: [],
              termSize: 5,
              threshold: [-1],
              thresholdComparator: '<',
              timeWindowSize: 5,
              timeWindowUnit: 'm',

            //   index: ['.kibana-event-log*'],
            //   timeField: '@timestamp',

                // index: ["kibana_sample_data_flights"],
                // timeField: "timestamp",

              //   index: ["kibana_sample_data_logs"],
              //   timeField: "timestamp",

                index: ["kibana_sample_data_ecommerce"],
                timeField: "order_date",
            },
          })
        );

        req.end();

        req.on('error', (error) => {
          console.error('error', error);
          numRequestsRemaining++;
          resolve();
        });
      });
    }
  })();
}
