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
import { Error } from './intake_v2/error';
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

interface ClientState {
  client: Client;
  enqueued: number;
  sendSpan: (s: Span) => Promise<void>;
  sendTransaction: (s: Transaction) => Promise<void>;
  sendError: (e: Error) => Promise<void>;
  flush: (o: any) => Promise<void>;
}
interface ClientStats {
  numEvents: number;
  numEventsDropped: number;
  numEventsEnqueued: number;
  numEventsSent: number;
  slowWriteBatch: number;
  backoffReconnectCount: number;
}
export class ApmSynthtraceApmClient {
  private readonly _serviceClients: Map<string, ClientState> = new Map<string, ClientState>();
  constructor(
    private readonly apmTarget: string,
    private readonly logger: Logger,
    options?: ApmSynthtraceApmClientOptions
  ) {}

  map(fields: ApmFields): [Span | Transaction, Error[]] {
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
      (c, v) => (c.outcome = v === 'failure' ? 'failure' : v === 'success' ? 'success' : 'unknown')
    );

    if (e.kind === 'span') {
      set('span.duration.us', e, (c, v) => (c.duration = v / 1000));
      set('span.type', e, (c, v) => (c.type = v));
      set('span.subtype', e, (c, v) => (c.subtype = v));

      const destination = (e.context.destination = e.context.destination ?? {});
      const destinationService = (destination.service = destination.service ?? { resource: '' });
      set('span.destination.service.resource', destinationService, (c, v) => (c.resource = v));
    }
    if (e.kind === 'transaction') {
      set('transaction.name', e, (c, v) => (c.name = v));
      set('transaction.type', e, (c, v) => (c.type = v));
      set('transaction.id', e, (c, v) => (c.id = v));
      set('transaction.duration.us', e, (c, v) => (c.duration = v / 1000));
      set('transaction.sampled', e, (c, v) => (c.sampled = v));
    }

    let errors: Error[] = [];
    if (fields['error.id']) {
      const exceptions = fields['error.exception'] ?? [];
      errors = exceptions.map((ex) => {
        const err: Error = {
          id: '0',
          timestamp: Math.trunc((fields['@timestamp'] ?? 0) * 1000),
          context: e.context,
        };
        set('error.id', err, (c, v) => (c.id = v));
        set('parent.id', err, (c, v) => (c.parent_id = v));
        set('trace.id', err, (c, v) => (c.trace_id = v));
        set('transaction.id', err, (c, v) => (c.transaction_id = v));
        set('error.grouping_name', err, (c, v) => (c.culprit = v));
        err.exception = {
          message: ex.message,
          type: 'Exception',
        };
        if (!err.parent_id) err.parent_id = err.transaction_id ?? err.trace_id;
        return err;
      });
    }

    // TODO include event more context
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

    return [e, errors];
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
    const queueSize = 10000;
    for await (const [item, _] of sideEffectYield()) {
      if (item == null) continue;

      const service = item.context?.service?.name ?? 'unknown';
      const hostName = fields ? fields['host.name'] : 'unknown';
      // TODO evaluate if we really need service specific clients
      // const lookup = `${service}::${hostName}`;
      const lookup = `constant_key::1`;
      if (!this._serviceClients.has(lookup)) {
        const client = new Client({
          userAgent: `apm-agent-synthtrace/${sp.version}`,
          serverUrl: this.apmTarget,
          maxQueueSize: queueSize,
          bufferWindowSize: queueSize / 2,

          serviceName: service,
          serviceNodeName: service,
          agentName: 'synthtrace',
          agentVersion: sp.version,
          serviceVersion: item.context?.service?.version ?? sp.version,
          frameworkName: item.context?.service?.framework?.name ?? undefined,
          frameworkVersion: item.context?.service?.framework?.version ?? undefined,
          hostname: hostName,
        });
        this._serviceClients.set(lookup, {
          client,
          enqueued: 0,
          sendSpan: Util.promisify(client.sendSpan).bind(client),
          sendTransaction: Util.promisify(client.sendTransaction).bind(client),
          sendError: Util.promisify(client.sendError).bind(client),
          flush: Util.promisify(client.flush).bind(client),
        });
      }
      const clientState = this._serviceClients.get(lookup)!;

      if (yielded === 0) {
        options?.itemStartStopCallback?.apply(this, [fields, false]);
      }
      if (item.kind === 'span') {
        clientState.sendSpan(item);
      } else if (item.kind === 'transaction') {
        clientState.sendTransaction(item);
      }
      yielded++;
      clientState.enqueued++;
      /* TODO finish implementing sending errors
      errors.forEach((e) => {
        clientState.sendError(e);
        clientState.enqueued++;
      });*/
      if (clientState.enqueued % queueSize === 0) {
        this.logger.debug(
          ` -- ${sp.name} Flushing client: ${lookup} after enqueueing ${clientState.enqueued}`
        );
        await clientState.flush({});
      }
    }
    for (const [, state] of this._serviceClients) {
      await state.flush({});
    }
    // this attempts to group similar service names together for cleaner reporting
    const totals = Array.from(this._serviceClients).reduce((p, c, i, a) => {
      const serviceName = c[0].split('::')[0].replace(/-\d+$/, '');
      if (!p.has(serviceName)) {
        p.set(serviceName, { enqueued: 0, sent: 0, names: new Set<string>() });
      }
      const s = p.get(serviceName)!;
      s.enqueued += c[1].enqueued;
      s.sent += c[1].client.sent;
      s.names.add(c[0]);
      const stats = c[1].client._getStats();
      if (!s.stats) {
        s.stats = stats;
      } else {
        s.stats.backoffReconnectCount += stats.backoffReconnectCount;
        s.stats.numEvents += stats.numEvents;
        s.stats.numEventsSent += stats.numEventsSent;
        s.stats.numEventsDropped += stats.numEventsDropped;
        s.stats.numEventsEnqueued += stats.numEventsEnqueued;
        s.stats.slowWriteBatch += stats.slowWriteBatch;
      }
      return p;
    }, new Map<string, { enqueued: number; sent: number; names: Set<string>; stats?: ClientStats }>());
    for (const [serviceGroup, state] of totals) {
      // only report details if there is a discrepancy in the bookkeeping of synthtrace and the client
      if (
        state.stats &&
        (state.stats.numEventsDropped > 0 || state.enqueued !== state.stats.numEventsSent)
      ) {
        this.logger.info(
          ` -- ${serviceGroup} (${state.names.size} services) sent: ${state.sent}, enqueued: ${state.enqueued}`
        );
        this.logger.info(` -- ${serviceGroup} (${state.names.size} services) client stats`);
        this.logger.info(`    -- numEvents: ${state.stats.numEvents}`);
        this.logger.info(`    -- numEventsSent: ${state.stats.numEventsSent}`);
        this.logger.info(`    -- numEventsEnqueued: ${state.stats.numEventsEnqueued}`);
        this.logger.info(`    -- numEventsDropped: ${state.stats.numEventsDropped}`);
        this.logger.info(`    -- backoffReconnectCount: ${state.stats.backoffReconnectCount}`);
        this.logger.info(`    -- slowWriteBatch: ${state.stats.slowWriteBatch}`);
      }
    }

    options?.itemStartStopCallback?.apply(this, [fields, true]);
  }
}
