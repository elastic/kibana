/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { apm } from '@kbn/apm-synthtrace-client';
import { buildDslSchema, type CapabilityManifest } from './dsl';

function safeRequire<T = any>(mod: string): T | undefined {
  try {
    return require(mod);
  } catch {
    return undefined;
  }
}

function getZodToJsonSchema() {
  const zodToJsonSchema = safeRequire<typeof import('zod-to-json-schema')>('zod-to-json-schema');
  if (!zodToJsonSchema) {
    throw new Error(
      'zod-to-json-schema is required. Install it with: yarn add --dev zod-to-json-schema'
    );
  }
  return zodToJsonSchema.default || zodToJsonSchema;
}

function tryDiscoverSignals() {
  const client = safeRequire<any>('@kbn/apm-synthtrace-client');
  const supported: Array<'traces' | 'logs' | 'metrics' | 'synthetics' | 'hosts'> = [];
  if (client?.apm) {
    supported.push('traces', 'metrics');
  }
  if (client?.log || client?.otelLog) {
    supported.push('logs');
  }
  if (client?.infra) {
    supported.push('hosts');
  }
  if (client?.syntheticsMonitor) {
    supported.push('synthetics');
  }
  return Array.from(new Set(supported));
}

function scanAgentNames(): string[] {
  const scenariosDir = path.resolve(
    REPO_ROOT,
    'src/platform/packages/shared/kbn-apm-synthtrace/src/scenarios'
  );
  const agentNames = new Set<string>();
  if (!fs.existsSync(scenariosDir)) return [];

  function scanDir(dir: string) {
    const entries = fs.readdirSync(dir);
    for (const file of entries) {
      const full = path.join(dir, file);
      if (fs.statSync(full).isDirectory()) {
        scanDir(full);
        continue;
      }
      if (!full.endsWith('.ts')) continue;
      const content = fs.readFileSync(full, 'utf-8');
      // Match agentName in various formats
      const patterns = [
        /agentName:\s*['"]([a-zA-Z0-9_.-]+)['"]/g,
        /agent\.name['"]:\s*['"]([a-zA-Z0-9_.-]+)['"]/g,
        /['"]agent\.name['"]:\s*['"]([a-zA-Z0-9_.-]+)['"]/g,
      ];
      for (const regex of patterns) {
        let m: RegExpExecArray | null;
        while ((m = regex.exec(content))) agentNames.add(m[1]);
      }
    }
  }

  scanDir(scenariosDir);

  // Add known agents from the types if found
  const knownAgents = [
    'java',
    'nodejs',
    'go',
    'python',
    'dotnet',
    'rum-js',
    'ruby',
    'php',
    'opbeans-java',
    'opbeans-node',
    'opbeans-python',
    'opbeans-ruby',
    'opbeans-dotnet',
    'synth-agent',
    'otlp',
    'opentelemetry',
    'js-base',
    'iOS/swift',
    'android/java',
  ];
  knownAgents.forEach((a) => agentNames.add(a));

  return Array.from(agentNames).sort();
}

function scanSpanTypes(): { types: string[]; subtypes: string[] } {
  const scenariosDir = path.resolve(
    REPO_ROOT,
    'src/platform/packages/shared/kbn-apm-synthtrace/src/scenarios'
  );
  const spanTypes = new Set<string>();
  const spanSubtypes = new Set<string>();

  if (!fs.existsSync(scenariosDir)) {
    return { types: ['db', 'app', 'external', 'custom', 'messaging'], subtypes: ['elasticsearch'] };
  }

  function scanDir(dir: string) {
    const entries = fs.readdirSync(dir);
    for (const file of entries) {
      const full = path.join(dir, file);
      if (fs.statSync(full).isDirectory()) {
        scanDir(full);
        continue;
      }
      if (!full.endsWith('.ts')) continue;
      const content = fs.readFileSync(full, 'utf-8');

      // Match spanType
      const typePatterns = [
        /spanType:\s*['"]([a-zA-Z0-9_.-]+)['"]/g,
        /['"]span\.type['"]:\s*['"]([a-zA-Z0-9_.-]+)['"]/g,
      ];
      for (const regex of typePatterns) {
        let m: RegExpExecArray | null;
        while ((m = regex.exec(content))) spanTypes.add(m[1]);
      }

      // Match spanSubtype
      const subtypePatterns = [
        /spanSubtype:\s*['"]([a-zA-Z0-9_.-]+)['"]/g,
        /['"]span\.subtype['"]:\s*['"]([a-zA-Z0-9_.-]+)['"]/g,
      ];
      for (const regex of subtypePatterns) {
        let m: RegExpExecArray | null;
        while ((m = regex.exec(content))) spanSubtypes.add(m[1]);
      }
    }
  }

  scanDir(scenariosDir);

  // Add known types/subtypes if not found
  if (spanTypes.size === 0) {
    ['db', 'app', 'external', 'custom', 'messaging'].forEach((t) => spanTypes.add(t));
  }
  if (spanSubtypes.size === 0) {
    ['elasticsearch', 'http', 'postgresql', 'mysql', 'redis'].forEach((s) => spanSubtypes.add(s));
  }

  return { types: Array.from(spanTypes).sort(), subtypes: Array.from(spanSubtypes).sort() };
}

function runtimeCorrelationSampling(): string[] {
  const now = Date.now();
  const keysPerSignal: string[][] = [];
  const allKeys = new Set<string>();

  try {
    // Sample traces/transactions
    const service = apm.service({ name: 'sample', environment: 'production', agentName: 'nodejs' });
    const instance = service.instance('instance-1');
    const tx = instance
      .transaction({ transactionName: 'GET /sample' })
      .timestamp(now)
      .duration(100)
      .success();
    const traceEvents = tx.serialize();
    const traceKeys = new Set<string>();
    for (const e of traceEvents) Object.keys(e).forEach((kk) => traceKeys.add(kk));
    keysPerSignal.push(Array.from(traceKeys));
    traceKeys.forEach((k) => allKeys.add(k));

    // Sample metrics
    const metrics = instance
      .appMetrics({ 'system.memory.actual.free': 1, 'system.memory.total': 2 })
      .timestamp(now)
      .serialize();
    const metricKeys = new Set<string>();
    for (const e of metrics) Object.keys(e).forEach((kk) => metricKeys.add(kk));
    keysPerSignal.push(Array.from(metricKeys));
    metricKeys.forEach((k) => allKeys.add(k));

    // Sample logs if available
    const logClient = safeRequire<any>('@kbn/apm-synthtrace-client')?.log;
    if (logClient) {
      try {
        const logEvent = logClient
          .create()
          .message('sample log')
          .logLevel('info')
          .service('sample-service')
          .timestamp(now)
          .serialize();
        const logKeys = new Set<string>();
        for (const e of logEvent) Object.keys(e).forEach((kk) => logKeys.add(kk));
        keysPerSignal.push(Array.from(logKeys));
        logKeys.forEach((k) => allKeys.add(k));
      } catch {
        // ignore log sampling failures
      }
    }

    // Sample infra/hosts if available
    const infraClient = safeRequire<any>('@kbn/apm-synthtrace-client')?.infra;
    if (infraClient) {
      try {
        const host = infraClient.host('sample-host');
        const hostMetrics = host.cpu().timestamp(now).serialize();
        const hostKeys = new Set<string>();
        for (const e of hostMetrics) Object.keys(e).forEach((kk) => hostKeys.add(kk));
        keysPerSignal.push(Array.from(hostKeys));
        hostKeys.forEach((k) => allKeys.add(k));
      } catch {
        // ignore infra sampling failures
      }
    }
  } catch {
    // ignore sampling failures
  }

  // Find intersection of keys across all signals (true correlation keys)
  let intersection = new Set<string>();
  if (keysPerSignal.length > 0) {
    intersection = new Set(keysPerSignal[0]);
    for (const arr of keysPerSignal.slice(1)) {
      intersection = new Set(arr.filter((k) => intersection.has(k)));
    }
  }

  // Known correlation keys from scenarios
  const knownCorrelationKeys = [
    'trace.id',
    'transaction.id',
    'span.id',
    'service.name',
    'host.name',
    'agent.id',
    'agent.name',
    'container.id',
    'host.hostname',
    'service.environment',
  ];

  // Combine discovered intersection with known keys that exist in any signal
  const correlationKeys = new Set<string>();

  // Add intersection keys (appear in multiple signals)
  intersection.forEach((k) => correlationKeys.add(k));

  // Add known keys that appear in any signal
  knownCorrelationKeys.forEach((k) => {
    if (allKeys.has(k)) {
      correlationKeys.add(k);
    }
  });

  // Scan scenarios for correlation key usage
  const scenariosDir = path.resolve(
    REPO_ROOT,
    'src/platform/packages/shared/kbn-apm-synthtrace/src/scenarios'
  );
  if (fs.existsSync(scenariosDir)) {
    function scanDir(dir: string) {
      const entries = fs.readdirSync(dir);
      for (const file of entries) {
        const full = path.join(dir, file);
        if (fs.statSync(full).isDirectory()) {
          scanDir(full);
          continue;
        }
        if (!full.endsWith('.ts')) continue;
        const content = fs.readFileSync(full, 'utf-8');
        // Look for common correlation patterns in defaults()
        const correlationPattern =
          /(['"](trace|transaction|span|service|host|agent|container)\.(id|name|hostname|environment)['"])/g;
        let m: RegExpExecArray | null;
        while ((m = correlationPattern.exec(content))) {
          const key = m[1].replace(/['"]/g, '');
          if (key.includes('.')) {
            correlationKeys.add(key);
          }
        }
      }
    }
    scanDir(scenariosDir);
  }

  // Return sorted, deduplicated list
  const result = Array.from(correlationKeys).sort();
  return result.length > 0 ? result : knownCorrelationKeys;
}

export function generateSchema() {
  const supportedSignals = tryDiscoverSignals();
  const { types: spanTypes, subtypes: spanSubtypes } = scanSpanTypes();
  const manifest: CapabilityManifest = {
    supportedSignals,
    supportedEntities: ['services', 'instances', 'agents', 'hosts'],
    enums: {
      agentNames: scanAgentNames(),
      spanTypes,
      spanSubtypes,
    },
    correlationKeys: runtimeCorrelationSampling(),
  };

  const outDir = path.resolve(
    REPO_ROOT,
    'src/platform/packages/shared/kbn-apm-synthtrace/src/synth_schema'
  );

  const capabilitiesPath = path.join(outDir, 'capabilities.json');
  fs.writeFileSync(capabilitiesPath, JSON.stringify(manifest, null, 2));

  const zodSchema = buildDslSchema(manifest);
  const zodToJsonSchema = getZodToJsonSchema();
  const jsonSchema = zodToJsonSchema(zodSchema, { name: 'Synthtrace DSL' });

  const schemaPath = path.join(outDir, 'schema.json');
  fs.writeFileSync(schemaPath, JSON.stringify(jsonSchema, null, 2));

  return jsonSchema;
}

export function loadManifest(): CapabilityManifest {
  const manifestPath = path.resolve(
    REPO_ROOT,
    'src/platform/packages/shared/kbn-apm-synthtrace/src/synth_schema/capabilities.json'
  );
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `Capability manifest not found at ${manifestPath}. Run 'schema generate' first.`
    );
  }
  return JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as CapabilityManifest;
}
