/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceEdge, ServiceGraph, ServiceNode } from '../../../lib/service_graph_logs/types';
import { defineMockApp } from '../utils';

// IoT device telemetry ingestion pipeline:
//   ingest-gateway → device-registry / telemetry-processor
//   telemetry-processor → rule-engine (kafka) / firmware-service
//   rule-engine → command-dispatcher
// Telemetry flows through kafka as the central stream; elasticsearch is the
// timeseries store; postgres backs the device registry; redis caches device
// state. Error pools deliberately include security-flavoured lines (rogue
// devices, forged certificates, firmware tampering, malicious command
// injection) so query generation produces high-severity (security-class) queries.
const SERVICES = [
  {
    name: 'ingest-gateway',
    runtime: 'go',
    infraDeps: ['kafka', 'redis'],
    version: '3.4.1',
    deployment: { k8s: { namespace: 'ingest' } },
    serviceLogs: {
      success: [
        'Telemetry batch accepted',
        'Device handshake completed',
        'MQTT session established',
      ],
      error: [
        'Rejected telemetry from unauthorized device: forged device certificate',
        'Rogue device detected: connection attempt from unregistered hardware id',
        'Telemetry publish failed: unable to reach Kafka broker after 3 retries',
      ],
    },
  } as const,
  {
    name: 'device-registry',
    runtime: 'java',
    infraDeps: ['postgres', 'redis'],
    version: '2.8.0',
    deployment: { k8s: { namespace: 'registry' } },
    serviceLogs: {
      success: ['Device record resolved', 'Provisioning token issued', 'Device state cached'],
      error: [
        'Device lookup failed: registry datastore connection timeout',
        'Provisioning rejected: device credential signature mismatch',
        'Device state cache miss: redis eviction under memory pressure',
      ],
    },
  } as const,
  {
    name: 'telemetry-processor',
    runtime: 'go',
    infraDeps: ['kafka', 'elasticsearch'],
    version: '4.1.2',
    deployment: { k8s: { namespace: 'processing' } },
    serviceLogs: {
      success: [
        'Telemetry frame decoded',
        'Metrics indexed to timeseries store',
        'Stream offset committed',
      ],
      error: [
        'Telemetry indexing failed: timeseries store rejected bulk write',
        'Frame decode aborted: malformed payload from suspected tampered firmware',
        'Stream consume stalled: kafka partition rebalance timed out',
      ],
    },
  } as const,
  {
    name: 'rule-engine',
    runtime: 'python',
    infraDeps: ['elasticsearch', 'mongodb'],
    version: '1.6.3',
    deployment: { k8s: { namespace: 'rules' } },
    serviceLogs: {
      success: ['Rule evaluated', 'Threshold alert raised', 'Rule set reloaded'],
      error: [
        'Rule evaluation failed: timeseries query timed out',
        'Rule set load failed: rule store connection timeout',
        'Anomalous device signal flagged: possible compromised sensor fleet',
      ],
    },
  } as const,
  {
    name: 'command-dispatcher',
    runtime: 'node',
    infraDeps: ['kafka', 'redis'],
    version: '2.0.5',
    deployment: { k8s: { namespace: 'commands' } },
    serviceLogs: {
      success: ['Command queued', 'Actuation acknowledged', 'Command dispatched to device'],
      error: [
        'Dropped command: malicious command injection blocked by policy guard',
        'Command publish failed: message queue broker unavailable',
        'Command ack timeout: target device unreachable after 30s',
      ],
    },
  } as const,
  {
    name: 'firmware-service',
    runtime: 'java',
    infraDeps: ['postgres', 'elasticsearch'],
    version: '1.3.0',
    deployment: { k8s: { namespace: 'firmware' } },
    serviceLogs: {
      success: ['Firmware manifest served', 'OTA update scheduled', 'Firmware signature verified'],
      error: [
        'Firmware delivery blocked: image signature verification failed (possible tampering)',
        'OTA scheduling failed: firmware metadata store transaction rolled back after timeout',
        'Unhandled error in firmware pipeline: update rollout aborted',
      ],
    },
  } as const,
] satisfies ServiceNode[];

const EDGES = [
  { source: 'ingest-gateway', target: 'device-registry', protocol: 'grpc' },
  { source: 'ingest-gateway', target: 'telemetry-processor', protocol: 'kafka' },
  { source: 'telemetry-processor', target: 'rule-engine', protocol: 'kafka' },
  { source: 'telemetry-processor', target: 'firmware-service', protocol: 'http' },
  { source: 'rule-engine', target: 'command-dispatcher', protocol: 'http' },
  { source: 'command-dispatcher', target: 'device-registry', protocol: 'grpc' },
] satisfies ServiceEdge[];

const IOT_TELEMETRY_GRAPH = { edges: EDGES, services: SERVICES } satisfies ServiceGraph;

export const IOT_TELEMETRY_APP = defineMockApp({
  serviceGraph: IOT_TELEMETRY_GRAPH,
  entryService: 'ingest-gateway',
  scenarios: {
    // All services healthy.
    healthy_baseline: {
      build() {
        return {};
      },
    },

    // kafka telemetry stream brokers degrade at 75% for 6 min; 2-min warn ramp; ingest backs up and telemetry-processor stalls.
    telemetry_stream_outage: {
      cycleDurationMinutes: 10,
      build({ phase, phases }) {
        return phases([
          phase('0m', '2m', {
            failures: { infra: { kafka: { errorType: 'message_queue_failure', rate: 0.2 } } },
            volume: { 'ingest-gateway': { scale: 1.5 }, kafka: { scale: 3 } },
            noise: { scale: 3 },
          }),
          phase('2m', '8m', {
            failures: { infra: { kafka: { errorType: 'message_queue_failure', rate: 0.75 } } },
            volume: {
              'ingest-gateway': { scale: 2 },
              'telemetry-processor': { scale: 2 },
              kafka: { scale: 4 },
            },
            noise: { scale: 4 },
          }),
        ]);
      },
    },

    // postgres (device registry) times out at 80% for 5 min; cascades to ingest-gateway, command-dispatcher, firmware-service.
    registry_db_timeout: {
      cycleDurationMinutes: 10,
      build({ phase }) {
        return phase('0m', '5m', {
          failures: { infra: { postgres: { errorType: 'db_timeout', rate: 0.8 } } },
          volume: { 'device-registry': { scale: 2 }, postgres: { scale: 4 } },
          noise: { scale: 2 },
        });
      },
    },

    // redis device-state cache evicts hot keys at 65% for 5 min; device-registry, ingest-gateway and command-dispatcher degrade.
    device_state_cache_eviction: {
      cycleDurationMinutes: 9,
      build({ phase }) {
        return phase('0m', '5m', {
          failures: { infra: { redis: { errorType: 'cache_failure', rate: 0.65 } } },
          volume: {
            'device-registry': { scale: 3 },
            'command-dispatcher': { scale: 2 },
            redis: { scale: 4 },
          },
          noise: { scale: 3 },
        });
      },
    },

    // elasticsearch timeseries store rejects bulk writes at 70% for 6 min; telemetry-processor, rule-engine and firmware-service degrade.
    timeseries_store_overload: {
      cycleDurationMinutes: 10,
      build({ phase }) {
        return phase('0m', '6m', {
          failures: { infra: { elasticsearch: { errorType: 'db_timeout', rate: 0.7 } } },
          volume: {
            'telemetry-processor': { scale: 3 },
            'rule-engine': { scale: 2 },
            elasticsearch: { scale: 4 },
          },
          noise: { scale: 3 },
        });
      },
    },

    // Three-stage processor meltdown: kafka stream backs up → telemetry-processor OOM-killed → CrashLoopBackOff; clean recovery after.
    processor_meltdown: {
      cycleDurationMinutes: 12,
      build({ phase, phases }) {
        return phases([
          // Stage 1: kafka broker stalls → consumer lag climbs.
          phase('0m', '2m', {
            failures: { infra: { kafka: { errorType: 'message_queue_failure', rate: 0.8 } } },
            volume: { 'telemetry-processor': { scale: 3 }, kafka: { scale: 4 } },
            noise: { scale: 3 },
          }),
          // Stage 2: unprocessed backlog peaks → telemetry-processor OOM-killed.
          phase('2m', '6m', {
            failures: {
              infra: { kafka: { errorType: 'message_queue_failure', rate: 0.8 } },
              services: {
                'telemetry-processor': { errorType: 'k8s_oom', rate: 0.6, multiplier: 4 },
              },
            },
            volume: { 'telemetry-processor': { scale: 10 }, kafka: { scale: 4 } },
            noise: { scale: 10 },
          }),
          // Stage 3: kubelet backoff → telemetry-processor crash-loops.
          phase('6m', '9m', {
            failures: {
              services: {
                'telemetry-processor': {
                  errorType: 'k8s_crash_loop_backoff',
                  rate: 0.95,
                  multiplier: 5,
                },
              },
            },
            volume: { 'telemetry-processor': { scale: 2 } },
            noise: { scale: 6 },
          }),
        ]);
      },
    },

    // Rogue-device flood: ingest-gateway 5× burst, command-dispatcher gateway times out under load; rogue-device/forged-cert noise fires as red herrings.
    rogue_device_flood: {
      cycleDurationMinutes: 10,
      build({ phase }) {
        return {
          ...phase('0m', '6m', {
            failures: {
              services: { 'command-dispatcher': { errorType: 'gateway_timeout', rate: 0.5 } },
            },
            volume: {
              'ingest-gateway': { scale: 5 },
              'device-registry': { scale: 3 },
              'command-dispatcher': { scale: 3 },
            },
            noise: { scale: 5 },
          }),
          ghostMentions: [
            {
              message:
                'WAF blocked suspected botnet device-registration burst from unallocated IP range',
              rate: 0.4,
            },
            {
              message: 'Rate limiter tripped: anomalous telemetry connection volume per device id',
              rate: 0.3,
            },
          ],
        };
      },
    },
  },
});
