/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import { ESDocumentWithOperation, OAMAssetDocument } from '@kbn/apm-synthtrace-client';
import { PassThrough, pipeline, Readable, Transform } from 'stream';
import { SynthtraceEsClient, SynthtraceEsClientOptions } from '../shared/base_client';
import { getDedotTransform } from '../shared/get_dedot_transform';
import { getSerializeTransform } from '../shared/get_serialize_transform';
import { Logger } from '../utils/create_logger';
import { fork } from '../utils/stream_utils';
import { createAssetsAggregator } from './aggregators/create_assets_aggregator';

export type AssetsSynthtraceEsClientOptions = Omit<SynthtraceEsClientOptions, 'pipeline'>;

export class AssetsSynthtraceEsClient extends SynthtraceEsClient<OAMAssetDocument> {
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
    const aggregators = [createAssetsAggregator()];
    return pipeline(
      base,
      getSerializeTransform(),
      fork(new PassThrough({ objectMode: true }), ...aggregators),
      assetsFilterTransform(),
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

function assetsFilterTransform() {
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<OAMAssetDocument>, encoding, callback) {
      if ('asset.id' in document) {
        callback(null, document);
      } else {
        callback();
      }
    },
  });
}

function getRoutingTransform() {
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<OAMAssetDocument>, encoding, callback) {
      console.log('### caue  transform  document:', document);
      if ('asset.type' in document) {
        document._index = `assets-${document['asset.type']}-default`;
      } else {
        throw new Error(`Cannot determine index for event ${JSON.stringify(document)}`);
      }

      callback(null, document);
    },
  });
}
