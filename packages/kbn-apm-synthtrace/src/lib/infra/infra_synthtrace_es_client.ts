/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import { ESDocumentWithOperation, InfraDocument } from '@kbn/apm-synthtrace-client';
import { pipeline, Readable, Transform } from 'stream';
import { SynthtraceEsClient, SynthtraceEsClientOptions } from '../shared/base_client';
import { getDedotTransform } from '../shared/get_dedot_transform';
import { getSerializeTransform } from '../shared/get_serialize_transform';
import { Logger } from '../utils/create_logger';

export type InfraSynthtraceEsClientOptions = Omit<SynthtraceEsClientOptions, 'pipeline'>;

export class InfraSynthtraceEsClient extends SynthtraceEsClient<InfraDocument> {
  constructor(options: { client: Client; logger: Logger } & InfraSynthtraceEsClientOptions) {
    super({
      ...options,
      pipeline: infraPipeline(),
    });
    this.dataStreams = [
      'metrics-system*',
      'metrics-kubernetes*',
      'metrics-docker*',
      'metrics-aws*',
      'metricbeat-*',
      'logs-*',
    ];
  }
}

function infraPipeline() {
  return (base: Readable) => {
    return pipeline(
      base,
      getSerializeTransform(),
      getRoutingTransform(),
      getDedotTransform(),
      (err: unknown) => {
        if (err) {
          throw err;
        }
      }
    );
  };
}

function getRoutingTransform() {
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<InfraDocument>, encoding, callback) {
      const metricset = document['metricset.name'];

      if (metricset === 'cpu') {
        document._index = 'metrics-system.cpu-default';
      } else if (metricset === 'memory') {
        document._index = 'metrics-system.memory-default';
      } else if (metricset === 'network') {
        document._index = 'metrics-system.network-default';
      } else if (metricset === 'load') {
        document._index = 'metrics-system.load-default';
      } else if (metricset === 'filesystem') {
        document._index = 'metrics-system.filesystem-default';
      } else if (metricset === 'diskio') {
        document._index = 'metrics-system.diskio-default';
      } else if (metricset === 'core') {
        document._index = 'metrics-system.core-default';
      } else if ('container.id' in document) {
        document._index = 'metrics-docker.container-default';
        document._index = 'metrics-kubernetes.container-default';
      } else if ('kubernetes.pod.uid' in document) {
        document._index = 'metrics-kubernetes.pod-default';
      } else if ('aws.rds.db_instance.arn' in document) {
        document._index = 'metrics-aws.rds-default';
      } else {
        throw new Error('Cannot determine index for event');
      }

      callback(null, document);
    },
  });
}
