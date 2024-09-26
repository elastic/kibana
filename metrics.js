/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const https = require('http');

// Define Elasticsearch host and port
const ELASTIC_HOST = 'localhost'; // Replace with your Elasticsearch host
const ELASTIC_PORT = 9200; // Change to 9200 if you use HTTP instead of HTTPS
const ELASTIC_USER = 'elastic'; // Elasticsearch username
const ELASTIC_PASS = 'changeme'; // Elasticsearch password

// Encode the credentials for basic auth (Base64)
const auth = Buffer.from(`${ELASTIC_USER}:${ELASTIC_PASS}`).toString('base64');

// Hosts array
const hosts = ['prod.001', 'prod.002', 'prod.003'];

// Function to send fake metrics
function sendMetrics() {
  const timestamp = new Date().toISOString();

  hosts.forEach((host) => {
    const data = JSON.stringify({
      '@timestamp': timestamp,
      data_stream: {
        namespace: 'default',
        type: 'metrics',
        dataset: 'system.cpu',
      },
      host: {
        name: `mongodb.${host}`,
      },
      system: {
        cpu: {
          cores: 5, // Simulating 5 cores for all hosts
        },
      },
    });

    const options = {
      hostname: ELASTIC_HOST,
      port: ELASTIC_PORT,
      path: '/metrics-system.cpu-default/_doc',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        Authorization: `Basic ${auth}`, // Add Basic Auth header
      },
    };

    // Send request
    const req = https.request(options, (res) => {
      let responseBody = '';

      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        console.log(`Metrics sent for host ${host}. Status: ${res.statusCode}`);
        console.log('Response:', responseBody);
      });
    });

    req.on('error', (error) => {
      console.error(`Error sending metrics for host ${host}:`, error);
    });

    // Write data to request body
    req.write(data);
    req.end();
  });
}

// Send metrics every second
setInterval(sendMetrics, 1000);
