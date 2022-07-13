/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Client from 'elastic-apm-http-client';
import Util from 'util';
import { Logger } from '../../utils/create_logger';
import { ApmFields } from '../apm_fields';
import { EntityIterable } from '../../entity_iterable';
import { StreamProcessor } from '../../stream_processor';
import { EntityStreams } from '../../entity_streams';
import { Fields } from '../../entity';
import { Span } from './intake_v2/span';
import { Metadata } from './intake_v2/metadata';
import { Transaction } from './intake_v2/transaction';

export interface StreamToBulkOptions<TFields extends Fields = ApmFields> {
  concurrency?: number;
  // the maximum number of documents to process
  maxDocs?: number;
  // the number of documents to flush the bulk operation defaults to 10k
  flushInterval?: number;
  mapToIndex?: (document: Record<string, any>) => string;
  dryRun: boolean;
  itemStartStopCallback?: (item: TFields | null, done: boolean) => void;
}

export interface ApmSynthtraceApmClientOptions {
  forceLegacyIndices?: boolean;
  // defaults to true if unspecified
  refreshAfterIndex?: boolean;
}
export class ApmSynthtraceApmClient {
  private readonly _serviceClients: Map<string, Client> = new Map<string, Client>();
  constructor(
    private readonly apmTarget: string,
    private readonly logger: Logger,
    options?: ApmSynthtraceApmClientOptions
  ) {}

  map(fields: ApmFields): Span | Transaction {
    const set = <T extends keyof ApmFields, K>(
      key: T,
      context: NonNullable<K>,
      setter: (context: NonNullable<K>, value: NonNullable<ApmFields[T]>) => void
    ) => {
      if (fields[key]) {
        setter(context, fields[key]!);
      }
    };
    const metadata: Metadata = {
      service: {
        name: fields['service.name'] ?? 'unknown',
        agent: {
          name: fields['agent.name'] ?? 'unknown',
          version: fields['agent.version'] ?? 'unknown',
        },
      },
    };

    const system = (metadata.system = metadata.system ?? {});
    const container = (system.container = system.container ?? {});
    const kubernetes = (system.kubernetes = system.kubernetes ?? {});
    const pod = (kubernetes.pod = kubernetes.pod ?? {});
    set('container.id', container, (c, v) => (c.id = v));
    set('host.name', system, (c, v) => (c.hostname = v));
    set('host.hostname', system, (c, v) => (c.configured_hostname = v));
    set('kubernetes.pod.name', pod, (c, v) => (c.name = v));
    set('kubernetes.pod.uid', pod, (c, v) => (c.uid = v));

    const e: Span | Transaction = fields['span.id']
      ? {
          kind: 'span',
          duration: fields['span.duration.us'] ?? 0,
          id: fields['span.id'] ?? '',
          name: fields['span.name'] ?? 'unknown',
          parent_id: fields['parent.id'] ?? '',
          type: fields['span.type'] ?? '',
          timestamp: Math.trunc((fields['@timestamp'] ?? 0) * 1000),
          trace_id: fields['trace.id'] ?? '',
        }
      : {
          kind: 'transaction',
          timestamp: Math.trunc((fields['@timestamp'] ?? 0) * 1000),
          duration: fields['transaction.duration.us'] ?? 0,
          id: fields['transaction.id'] ?? '',
          type: fields['transaction.type'] ?? '',
          trace_id: fields['trace.id'] ?? '',
          span_count: { dropped: null, started: 0 },
        };

    set('trace.id', e, (c, v) => (c.trace_id = v));
    set('parent.id', e, (c, v) => (c.parent_id = v));
    set(
      'span.links',
      e,
      (c, v) => (c.links = v.map((l) => ({ span_id: l.span?.id, trace_id: l.span?.id })))
    );

    e.context = {};
    const service = (e.context.service = e.context.service ?? {});
    set('service.name', service, (c, v) => (c.name = v));
    set('service.version', service, (c, v) => (c.version = v));
    set('service.environment', service, (c, v) => (c.environment = v));
    const node = (service.node = service.node ?? {});
    set('service.node.name', node, (c, v) => (c.configured_name = v));
    const agent = (service.agent = service.agent ?? {});
    set('agent.name', agent, (c, v) => (c.name = v));
    set('agent.version', agent, (c, v) => (c.version = v));
    const runtime = (service.runtime = service.runtime ?? {});
    set('service.runtime.name', runtime, (c, v) => (c.name = v));
    set('service.runtime.version', runtime, (c, v) => (c.version = v));
    const framework = (service.framework = service.framework ?? {});
    set('service.framework.name', framework, (c, v) => (c.name = v));

    set(
      'event.outcome',
      e,
      (c, v) => (c.outcome = v === 'failure' ? 'failure' : v === 'success' ? 'success' : null)
    );

    if (e.kind === 'span') {
      set('span.duration.us', e, (c, v) => (c.duration = v));
      set('span.type', e, (c, v) => (c.type = v));
      set('span.subtype', e, (c, v) => (c.subtype = v));

      const destination = (e.context.destination = e.context.destination ?? {});
      const destinationService = (destination.service = destination.service ?? { resource: '' });
      set('span.destination.service.name', destinationService, (c, v) => (c.name = v));
      set('span.destination.service.resource', destinationService, (c, v) => (c.resource = v));
      set('span.destination.service.type', destinationService, (c, v) => (c.type = v));
    }
    if (e.kind === 'transaction') {
      set('transaction.name', e, (c, v) => (c.name = v));
      set('transaction.type', e, (c, v) => (c.type = v));
      set('transaction.id', e, (c, v) => (c.id = v));
      set('transaction.duration.us', e, (c, v) => (c.duration = v));
      // 'transaction.sampled': true;
    }

    // 'error.id': string;
    // 'error.exception': ApmException[];
    // 'error.grouping_name': string;
    // 'error.grouping_key': string;

    // 'cloud.provider': string;
    // 'cloud.project.name': string;
    // 'cloud.service.name': string;
    // 'cloud.availability_zone': string;
    // 'cloud.machine.type': string;
    // 'cloud.region': string;
    // 'host.os.platform': string;
    // 'faas.id': string;
    // 'faas.coldstart': boolean;
    // 'faas.execution': string;
    // 'faas.trigger.type': string;
    // 'faas.trigger.request_id': string;

    return e;
  }

  async index<TFields>(
    events: EntityIterable<TFields> | Array<EntityIterable<TFields>>,
    options?: StreamToBulkOptions,
    streamProcessor?: StreamProcessor
  ) {
    const dataStream = Array.isArray(events) ? new EntityStreams(events) : events;
    const sp =
      streamProcessor != null
        ? streamProcessor
        : new StreamProcessor({
            processors: [],
            maxSourceEvents: options?.maxDocs,
            logger: this.logger,
          });

    let yielded = 0;
    let fields: ApmFields | null = null;
    // intentionally leaks `fields` so it can be pushed to callback events
    const sideEffectYield = () =>
      sp.streamToDocumentAsync((e) => {
        fields = e;
        return this.map(e);
      }, dataStream);

    if (options?.dryRun) {
      await this.logger.perf('enumerate_scenario', async () => {
        // @ts-ignore
        // We just want to enumerate
        for await (const item of sideEffectYield()) {
          if (yielded === 0) {
            options.itemStartStopCallback?.apply(this, [fields, false]);
            yielded++;
          }
        }
        options.itemStartStopCallback?.apply(this, [fields, true]);
      });
      return;
    }
    for await (const item of sideEffectYield()) {
      if (item == null) continue;

      const service = item.context?.service?.name ?? 'unknown';
      const hostName = fields ? fields['host.name'] : 'unknown';
      const lookup = `${service}-${hostName}`;
      if (!this._serviceClients.has(lookup)) {
        const client = new Client({
          userAgent: 'x',
          serverUrl: this.apmTarget,

          serviceName: service,
          serviceNodeName: service,
          agentName: 'synthtrace',
          agentVersion: sp.version,
          serviceVersion: item.context?.service?.version ?? sp.version,
          frameworkName: item.context?.service?.framework?.name ?? undefined,
          frameworkVersion: item.context?.service?.framework?.version ?? undefined,
          hostname: hostName,
        });
        this.logger.info(`Created a new client for: ${lookup}`);
        this._serviceClients.set(lookup, client);
      }
      const client = this._serviceClients.get(lookup)!;
      const sendSpan = Util.promisify(client.sendSpan).bind(client);
      const sendTransaction = Util.promisify(client.sendTransaction).bind(client);

      if (yielded === 0) {
        options?.itemStartStopCallback?.apply(this, [fields, false]);
        yielded++;
      }
      if (item.kind === 'span') {
        await sendSpan(item);
      } else if (item.kind === 'transaction') {
        await sendTransaction(item);
      }
    }
    for (const [clientName, client] of this._serviceClients) {
      const flush = Util.promisify(client.flush).bind(client);
      this.logger.info(`Flushing client: ${clientName}`);
      await flush({});
    }
    for (const [clientName, client] of this._serviceClients) {
      this.logger.info(`Events sent by client: ${clientName}, ${client.sent}`);
    }
    options?.itemStartStopCallback?.apply(this, [fields, true]);
  }
}
