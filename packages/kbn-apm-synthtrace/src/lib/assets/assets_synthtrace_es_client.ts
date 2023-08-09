/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import { AssetDocument, ESDocumentWithOperation } from '@kbn/apm-synthtrace-client';
import { pipeline, Readable, Transform } from 'stream';
import { SynthtraceEsClient, SynthtraceEsClientOptions } from '../shared/base_client';
import { getDedotTransform } from '../shared/get_dedot_transform';
import { getSerializeTransform } from '../shared/get_serialize_transform';
import { Logger } from '../utils/create_logger';

export type AssetsSynthtraceEsClientOptions = Omit<SynthtraceEsClientOptions, 'pipeline'>;

export class AssetsSynthtraceEsClient extends SynthtraceEsClient<AssetDocument> {
  constructor(options: { client: Client; logger: Logger } & AssetsSynthtraceEsClientOptions) {
    super({
      ...options,
      pipeline: assetsPipeline(),
    });
    this.dataStreams = ['assets-*'];
  }
}

function assetsPipeline() {
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
    transform(document: ESDocumentWithOperation<AssetDocument>, encoding, callback) {
      if ('asset.kind' in document) {
        document._index = `assets-${document['asset.kind']}-default`;
      } else {
        throw new Error('Cannot determine index for event');
      }

      callback(null, document);
    },
  });
}
