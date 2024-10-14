/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AgentName } from '../../types/agent_names';
import { apm } from '../apm';
import { Instance } from '../apm/instance';
import { elasticsearchSpan, redisSpan, sqliteSpan, Span } from '../apm/span';
import { Transaction } from '../apm/transaction';

const ENVIRONMENT = 'Synthtrace: service_map';

function service(serviceName: string, agentName: AgentName, environment?: string) {
  return apm
    .service({ name: serviceName, environment: environment || ENVIRONMENT, agentName })
    .instance(serviceName);
}

type DbSpan = 'elasticsearch' | 'redis' | 'sqlite';
type ServiceMapNode = Instance | DbSpan;
type TransactionName = string;
type TraceItem = ServiceMapNode | [ServiceMapNode, TransactionName];
type TracePath = TraceItem[];

function getTraceItem(traceItem: TraceItem) {
  if (Array.isArray(traceItem)) {
    const transactionName = traceItem[1];
    if (typeof traceItem[0] === 'string') {
      const dbSpan = traceItem[0];
      return { dbSpan, transactionName, serviceInstance: undefined };
    } else {
      const serviceInstance = traceItem[0];
      return { dbSpan: undefined, transactionName, serviceInstance };
    }
  } else if (typeof traceItem === 'string') {
    const dbSpan = traceItem;
    return { dbSpan, transactionName: undefined, serviceInstance: undefined };
  } else {
    const serviceInstance = traceItem;
    return { dbSpan: undefined, transactionName: undefined, serviceInstance };
  }
}

function getTransactionName(
  transactionName: string | undefined,
  serviceInstance: Instance,
  index: number
) {
  return transactionName || `GET /api/${serviceInstance.fields['service.name']}/${index}`;
}

function getChildren(
  childTraceItems: TracePath,
  parentServiceInstance: Instance,
  timestamp: number,
  index: number
): Span[] {
  if (childTraceItems.length === 0) {
    return [];
  }
  const [first, ...rest] = childTraceItems;
  const { dbSpan, serviceInstance, transactionName } = getTraceItem(first);
  if (dbSpan) {
    switch (dbSpan) {
      case 'elasticsearch':
        return [
          parentServiceInstance
            .span(elasticsearchSpan(transactionName || 'GET ad-*/_search'))
            .timestamp(timestamp)
            .duration(1000),
        ];
      case 'redis':
        return [
          parentServiceInstance
            .span(redisSpan(transactionName || 'INCR item:i012345:count'))
            .timestamp(timestamp)
            .duration(1000),
        ];
      case 'sqlite':
        return [
          parentServiceInstance
            .span(sqliteSpan(transactionName || 'SELECT * FROM items'))
            .timestamp(timestamp)
            .duration(1000),
        ];
    }
  }
  const childSpan = serviceInstance
    .span({
      spanName: getTransactionName(transactionName, serviceInstance, index),
      spanType: 'app',
    })
    .timestamp(timestamp)
    .duration(1000)
    .children(...getChildren(rest, serviceInstance, timestamp, index));
  if (rest[0]) {
    const next = getTraceItem(rest[0]);
    if (next.serviceInstance) {
      return [childSpan.destination(next.serviceInstance.fields['service.name']!)];
    }
  }
  return [childSpan];
}

interface TracePathOpts {
  path: TracePath;
  transaction?: (transaction: Transaction) => Transaction;
}
type PathDef = TracePath | TracePathOpts;
export interface ServiceMapOpts {
  services: Array<string | { [serviceName: string]: AgentName }>;
  definePaths: (services: Instance[]) => PathDef[];
  environment?: string;
}

export function serviceMap(options: ServiceMapOpts) {
  const serviceInstances = options.services.map((s) => {
    if (typeof s === 'string') {
      return service(s, 'nodejs', options.environment);
    }
    return service(Object.keys(s)[0], Object.values(s)[0], options.environment);
  });
  return (timestamp: number) => {
    const tracePaths = options.definePaths(serviceInstances);
    return tracePaths.map((traceDef, index) => {
      const tracePath = 'path' in traceDef ? traceDef.path : traceDef;
      const [first] = tracePath;

      const firstTraceItem = getTraceItem(first);
      if (firstTraceItem.serviceInstance === undefined) {
        throw new Error('First trace item must be a service instance');
      }
      const transactionName = getTransactionName(
        firstTraceItem.transactionName,
        firstTraceItem.serviceInstance,
        index
      );

      const transaction = firstTraceItem.serviceInstance
        .transaction({ transactionName, transactionType: 'request' })
        .timestamp(timestamp)
        .duration(1000)
        .children(...getChildren(tracePath, firstTraceItem.serviceInstance, timestamp, index));

      if ('transaction' in traceDef && traceDef.transaction) {
        return traceDef.transaction(transaction);
      }

      return transaction;
    });
  };
}
