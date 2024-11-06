/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Asset, AssetDocument } from './asset';

export interface ServiceAssetDocument extends AssetDocument {
  'service.language.name'?: string;
  'service.name': string;
  'service.node.name'?: string;
  'service.environment'?: string;
}

export class ServiceAsset extends Asset<ServiceAssetDocument> {
  constructor(fields: Omit<ServiceAssetDocument, 'asset.type'>) {
    super({ 'asset.type': 'service', ...fields });
  }
}
