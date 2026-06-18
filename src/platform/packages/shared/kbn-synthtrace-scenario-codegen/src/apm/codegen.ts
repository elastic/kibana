/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildScenarioModule } from '../build_scenario_module';
import { formatValue } from '../format';
import type { ErrorNode, ReconstructedTrace, TraceNode } from './reconstruct';

export interface CodegenOptions {
  /** Human-readable description of what was captured, recorded in the file header. */
  description?: string;
  /** Source cluster description, recorded in the file header for provenance. */
  source?: string;
  scrubbed?: boolean;
  /** Whether the capture hit the document cap and is therefore partial. */
  truncated?: boolean;
}

/**
 * Fixed (capture-size-independent) runtime code that rebuilds the synthtrace events from the
 * `captured` data literal. Emitted verbatim into every scenario.
 *
 * Nodes are stored as a FLAT array (`captured.nodes`) with each child referencing its parent by
 * index, not as a nested tree. A nested literal would make both Babel's recursive-descent parser
 * and a recursive builder overflow the stack on deep traces (long parent→child span chains). Here
 * everything is a flat loop, so arbitrary trace depth parses and builds without recursion. The
 * only locals are a handful of helpers, so the module never declares a per-event `const` either.
 *
 * Each service's captured `host.name` is reapplied via `.hostName(...)` (when present) so replayed
 * APM docs carry the correct host and surface in the Hosts view, even when it differs from the
 * service instance name.
 */
const BUILDER_RUNTIME = `      const services = new Map(
        captured.services.map((service) => {
          const instance = apm
            .service({
              name: service.name,
              environment: service.environment,
              agentName: service.agentName,
            })
            .instance(service.instance);
          if (service.hostName) {
            instance.hostName(service.hostName);
          }
          return [service.id, instance];
        })
      );

      const buildError = (error) =>
        services
          .get(error.service)
          .error({
            message: error.message,
            type: error.type,
            culprit: error.culprit,
            groupingKey: error.groupingKey,
          })
          .timestamp(start + error.offset);

      const builders = captured.nodes.map((node) => {
        const service = services.get(node.service);
        const builder =
          node.kind === 'transaction'
            ? service.transaction({
                transactionName: node.name,
                transactionType: node.transactionType,
              })
            : service.span({
                spanName: node.name,
                spanType: node.spanType,
                spanSubtype: node.spanSubtype,
              });

        builder.timestamp(start + node.offset).duration(node.duration);

        if (node.outcome === 'success') {
          builder.success();
        } else if (node.outcome === 'failure') {
          builder.failure();
        }

        if (node.overrides) {
          builder.overrides(node.overrides);
        }

        (node.errors || []).forEach((error) => builder.errors(buildError(error)));

        return builder;
      });

      captured.nodes.forEach((node, index) => {
        if (node.parent !== null && node.parent !== undefined) {
          builders[node.parent].children(builders[index]);
        }
      });

      const rootEvents = [
        ...builders.filter((_, index) => {
          const parent = captured.nodes[index].parent;
          return parent === null || parent === undefined;
        }),
        ...captured.rootErrors.map(buildError),
        ...captured.metrics.map((metric) =>
          services.get(metric.service).appMetrics(metric.metrics).timestamp(start + metric.offset)
        ),
      ];`;

/**
 * Renders a reconstructed trace as a runnable `@kbn/synthtrace` scenario module.
 *
 * The capture is emitted as a single `captured` data literal (services + a nested trace tree +
 * errors + metric samples) plus a small fixed builder loop, rather than one `const` per event.
 * This keeps the generated module compilable no matter how large the capture is.
 */
export const generateScenario = (trace: ReconstructedTrace, options: CodegenOptions): string => {
  const serviceId = new Map<string, string>();
  trace.services.forEach((service, index) => serviceId.set(service.key, `s${index + 1}`));

  const resolveServiceId = (key: string): string => {
    const id = serviceId.get(key);
    if (!id) {
      throw new Error(`No service registered for key "${key}"`);
    }
    return id;
  };

  const errorToData = (error: ErrorNode): Record<string, unknown> => ({
    service: resolveServiceId(error.serviceKey),
    offset: error.offsetMs,
    message: error.message,
    type: error.type,
    culprit: error.culprit,
    groupingKey: error.groupingKey,
  });

  // Flatten the trace tree into a list where each node references its parent by index. Done
  // iteratively (explicit stack) so a deep trace can't overflow the stack here, and emitted as a
  // flat array so the generated literal stays shallow (a nested literal overflows Babel's parser
  // on replay). Parent indices are always < the child's index because a node is appended before
  // its children are pushed.
  const nodes: Array<Record<string, unknown>> = [];
  const stack: Array<{ node: TraceNode; parent: number | null }> = [];
  for (let i = trace.roots.length - 1; i >= 0; i--) {
    stack.push({ node: trace.roots[i], parent: null });
  }
  while (stack.length > 0) {
    const { node, parent } = stack.pop()!;
    const index = nodes.length;
    nodes.push({
      kind: node.kind,
      service: resolveServiceId(node.serviceKey),
      name: node.name,
      transactionType: node.kind === 'transaction' ? node.transactionType : undefined,
      spanType: node.kind === 'span' ? node.spanType : undefined,
      spanSubtype: node.kind === 'span' ? node.spanSubtype : undefined,
      offset: node.offsetMs,
      duration: node.durationMs,
      outcome: node.outcome === 'success' || node.outcome === 'failure' ? node.outcome : undefined,
      overrides: Object.keys(node.overrides).length > 0 ? node.overrides : undefined,
      parent,
      errors: node.errors.length > 0 ? node.errors.map(errorToData) : undefined,
    });
    for (let i = node.children.length - 1; i >= 0; i--) {
      stack.push({ node: node.children[i], parent: index });
    }
  }

  const captured = {
    services: trace.services.map((service) => ({
      id: resolveServiceId(service.key),
      name: service.name,
      environment: service.environment,
      agentName: service.agentName,
      instance: service.instance,
      hostName: service.hostName,
    })),
    nodes,
    rootErrors: trace.rootErrors.map(errorToData),
    metrics: trace.metrics.map((metric) => ({
      service: resolveServiceId(metric.serviceKey),
      offset: metric.offsetMs,
      metrics: metric.metrics,
    })),
  };

  const body = `      const captured = ${formatValue(captured)};\n\n${BUILDER_RUNTIME}`;

  return buildScenarioModule({
    fieldsType: 'ApmFields',
    clientVarName: 'apmEsClient',
    imports: [
      "import type { ApmFields } from '@kbn/synthtrace-client';",
      "import { apm } from '@kbn/synthtrace-client';",
    ],
    startMs: trace.startMs,
    endMs: trace.endMs,
    documentCount: trace.documentCount,
    // Each service bakes in its own captured environment (from the data literal), so the
    // shared `getSynthtraceEnvironment` constant is not used and shouldn't be emitted.
    includeEnvironment: false,
    provenanceLines: [
      options.description ? ` * ${options.description}` : undefined,
      options.source ? ` * Source: ${options.source}` : undefined,
      options.scrubbed ? ' * Service names, instances and URLs were anonymized.' : undefined,
      ` * ${trace.services.length} service(s), ${trace.documentCount} document(s), ${trace.metrics.length} metric sample(s).`,
      options.truncated
        ? ' * NOTE: the capture hit the document cap and is therefore partial.'
        : undefined,
    ],
    body,
  });
};
