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

// Electronic Health Records (EHR) platform:
//   patient-portal → ehr-api / scheduling-service
//   ehr-api → records-store / lab-results-service / audit-service
//   records-store → audit-service (every record mutation is audited)
// Error pools deliberately include security-flavoured lines (PHI access violations,
// unauthorized record access, HIPAA audit failures, broken-glass override abuse) so
// query generation produces high-severity (security-class) queries.
const SERVICES = [
  {
    name: 'patient-portal',
    runtime: 'node',
    infraDeps: ['redis', 'elasticsearch'],
    version: '5.1.0',
    deployment: { k8s: { namespace: 'portal' } },
    serviceLogs: {
      success: ['Portal page rendered', 'Patient logged in', 'Session established from cache'],
      error: [
        'Unauthorized record access attempt: patient session lacks consent for requested chart',
        'Suspicious login pattern: possible credential stuffing against patient accounts',
        'Failed to load patient dashboard: upstream EHR API unavailable',
      ],
    },
  } as const,
  {
    name: 'ehr-api',
    runtime: 'java',
    infraDeps: ['postgres', 'kafka'],
    version: '4.3.2',
    deployment: { k8s: { namespace: 'ehr' } },
    serviceLogs: {
      success: ['Chart retrieved', 'Encounter created', 'HL7 event published'],
      error: [
        'PHI access violation: caller attempted to read a chart outside their care team scope',
        'Broken-glass override abuse detected: emergency-access flag used without documented justification',
        'Chart fetch failed: records datastore transaction rolled back after timeout',
        'HL7 event publish failed: unable to reach message broker after 3 retries',
      ],
    },
  } as const,
  {
    name: 'records-store',
    runtime: 'go',
    infraDeps: ['postgres', 'mongodb'],
    version: '3.0.4',
    deployment: { k8s: { namespace: 'records' } },
    serviceLogs: {
      success: ['Record persisted', 'Document version committed', 'Chart history compacted'],
      error: [
        'Record write failed: primary datastore connection timeout',
        'Document store reconciliation failed: stale record version conflict',
      ],
    },
  } as const,
  {
    name: 'scheduling-service',
    runtime: 'python',
    infraDeps: ['postgres', 'redis'],
    version: '2.7.1',
    deployment: { k8s: { namespace: 'scheduling' } },
    serviceLogs: {
      success: ['Appointment booked', 'Slot reserved', 'Reminder dispatched'],
      error: [
        'Appointment booking failed: double-booking guard rejected request',
        'Slot reservation failed: cache eviction under memory pressure',
      ],
    },
  } as const,
  {
    name: 'lab-results-service',
    runtime: 'java',
    infraDeps: ['kafka', 'elasticsearch'],
    version: '1.8.3',
    deployment: { k8s: { namespace: 'labs' } },
    serviceLogs: {
      success: ['Lab result indexed', 'Result released to chart', 'Critical value flagged'],
      error: [
        'Lab result ingestion failed: HL7 result message malformed on topic lab-events',
        'Result search failed: index unavailable, query timed out',
      ],
    },
  } as const,
  {
    name: 'audit-service',
    runtime: 'go',
    infraDeps: ['elasticsearch', 'kafka'],
    version: '2.2.0',
    deployment: { k8s: { namespace: 'audit' } },
    serviceLogs: {
      success: ['Audit event recorded', 'Access log indexed', 'Compliance trail sealed'],
      error: [
        'HIPAA audit failure: access event could not be persisted to the tamper-evident log',
        'Possible data exfiltration attempt: bulk chart export flagged for review',
        'Audit event publish failed: unable to reach message broker after 3 retries',
      ],
    },
  } as const,
] satisfies ServiceNode[];

const EDGES = [
  { source: 'patient-portal', target: 'ehr-api', protocol: 'http' },
  { source: 'patient-portal', target: 'scheduling-service', protocol: 'http' },
  { source: 'ehr-api', target: 'records-store', protocol: 'grpc' },
  { source: 'ehr-api', target: 'lab-results-service', protocol: 'http' },
  { source: 'ehr-api', target: 'audit-service', protocol: 'kafka' },
  { source: 'records-store', target: 'audit-service', protocol: 'kafka' },
] satisfies ServiceEdge[];

const HEALTHCARE_GRAPH = { edges: EDGES, services: SERVICES } satisfies ServiceGraph;

export const HEALTHCARE_APP = defineMockApp({
  serviceGraph: HEALTHCARE_GRAPH,
  entryService: 'patient-portal',
  scenarios: {
    // All services healthy.
    healthy_baseline: {
      build() {
        return {};
      },
    },

    // postgres (records datastore) times out at 80% for 5 min; cascades to records-store, ehr-api, scheduling.
    records_db_timeout: {
      cycleDurationMinutes: 10,
      build({ phase }) {
        return phase('0m', '5m', {
          failures: { infra: { postgres: { errorType: 'db_timeout', rate: 0.8 } } },
          volume: { 'records-store': { scale: 2 }, postgres: { scale: 4 } },
          noise: { scale: 2 },
        });
      },
    },

    // kafka (HL7/event stream) outage at 70% for 6 min; lab-results ingestion and audit event publish stall.
    hl7_stream_outage: {
      cycleDurationMinutes: 10,
      build({ phase }) {
        return phase('0m', '6m', {
          failures: { infra: { kafka: { errorType: 'message_queue_failure', rate: 0.7 } } },
          volume: { 'lab-results-service': { scale: 2 }, kafka: { scale: 4 } },
          noise: { scale: 3 },
        });
      },
    },

    // redis session cache evicts hot keys at 60% for 5 min; patient-portal and scheduling degrade.
    session_cache_eviction: {
      cycleDurationMinutes: 9,
      build({ phase }) {
        return phase('0m', '5m', {
          failures: { infra: { redis: { errorType: 'cache_failure', rate: 0.6 } } },
          volume: { 'patient-portal': { scale: 3 }, redis: { scale: 4 } },
          noise: { scale: 3 },
        });
      },
    },

    // ehr-api gateway times out at 70%; 2-min warn ramp (rate 0.2) precedes full incident for 5 min; cascades to patient-portal.
    ehr_api_timeout: {
      cycleDurationMinutes: 10,
      build({ phase, phases }) {
        return phases([
          // Warn ramp: upstream latency rising, circuit breaker threshold approaching.
          phase('0m', '2m', {
            failures: { services: { 'ehr-api': { errorType: 'gateway_timeout', rate: 0.2 } } },
            volume: { 'patient-portal': { scale: 1.5 }, 'ehr-api': { scale: 3 } },
            noise: { scale: 3 },
          }),
          phase('2m', '7m', {
            failures: { services: { 'ehr-api': { errorType: 'gateway_timeout', rate: 0.7 } } },
            volume: { 'patient-portal': { scale: 1.5 }, 'ehr-api': { scale: 3 } },
            noise: { scale: 3 },
          }),
        ]);
      },
    },

    // Three-stage records meltdown: postgres timeout → ehr-api OOM → CrashLoopBackOff; clean recovery after.
    ehr_records_meltdown: {
      cycleDurationMinutes: 12,
      build({ phase, phases }) {
        return phases([
          // Stage 1: postgres times out → callers retry.
          phase('0m', '2m', {
            failures: { infra: { postgres: { errorType: 'db_timeout', rate: 0.8 } } },
            volume: { 'ehr-api': { scale: 3 }, postgres: { scale: 4 } },
            noise: { scale: 3 },
          }),
          // Stage 2: retry backlog peaks → ehr-api OOM-killed.
          phase('2m', '6m', {
            failures: {
              infra: { postgres: { errorType: 'db_timeout', rate: 0.8 } },
              services: { 'ehr-api': { errorType: 'k8s_oom', rate: 0.6, multiplier: 4 } },
            },
            volume: { 'ehr-api': { scale: 10 }, postgres: { scale: 4 } },
            noise: { scale: 10 },
          }),
          // Stage 3: kubelet backoff → ehr-api crash-loops.
          phase('6m', '9m', {
            failures: {
              services: {
                'ehr-api': { errorType: 'k8s_crash_loop_backoff', rate: 0.95, multiplier: 5 },
              },
            },
            volume: { 'ehr-api': { scale: 2 } },
            noise: { scale: 6 },
          }),
        ]);
      },
    },

    // lab-results gateway times out at 70% for 5 min; misleading Redis and Kafka noise fire throughout as red herrings.
    lab_results_redis_herring: {
      cycleDurationMinutes: 10,
      build({ phase }) {
        return {
          ...phase('0m', '5m', {
            failures: {
              services: { 'lab-results-service': { errorType: 'gateway_timeout', rate: 0.7 } },
            },
            volume: { 'ehr-api': { scale: 2 }, 'lab-results-service': { scale: 4 } },
            noise: { scale: 4 },
          }),
          ghostMentions: [
            { message: 'Redis connection timeout after 5000ms', rate: 0.4 },
            { message: 'Kafka consumer lag detected on topic lab-events', rate: 0.2 },
          ],
        };
      },
    },
  },
});
