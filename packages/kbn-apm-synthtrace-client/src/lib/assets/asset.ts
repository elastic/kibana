/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Fields } from '../entity';
import { Serializable } from '../serializable';

type AssetType = 'host' | 'pod' | 'container' | 'service' | 'aws_rds';

export interface AssetDocument extends Fields {
  'asset.id': string;
  'asset.type': AssetType;
  'asset.first_seen': string;
  'asset.last_seen': string;
  'asset.identifying_metadata': string[];
  'asset.signalTypes': {
    'asset.traces'?: boolean;
    'asset.logs'?: boolean;
  };
}

export class Asset<F extends AssetDocument> extends Serializable<F> {}
