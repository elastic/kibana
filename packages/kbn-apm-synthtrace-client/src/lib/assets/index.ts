/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// eslint-disable-next-line max-classes-per-file
import { Fields } from '../entity';
import { Serializable } from '../serializable';

// Can I pull in types from asset-manager here?
type AssetKind = 'host' | 'pod' | 'container' | 'service' | 'aws_rds';

export interface AssetKindDocument<T extends AssetKind> extends Fields {
  'asset.kind': T;
  'asset.ean': string;
  'asset.id': string;
  'asset.name'?: string;
  'asset.parents'?: string[];
  'asset.children'?: string[];
  'asset.references'?: string[];
}

// What is the best way to tie up relationships?
// With these setters we can go both ways but the entities might be able to produce
// pre-linked assets as well
class Asset<T extends AssetKind> extends Serializable<AssetKindDocument<T>> {
  parents(parents: string[]) {
    this.fields['asset.parents'] = parents;
  }

  children(children: string[]) {
    this.fields['asset.children'] = children;
  }

  references(references: string[]) {
    this.fields['asset.references'] = references;
  }
}

export class HostAsset extends Asset<'host'> {}

export class PodAsset extends Asset<'pod'> {}

export class ContainerAsset extends Asset<'container'> {}

export class AWSRedisAsset extends Asset<'aws_rds'> {}

export class ServiceAsset extends Asset<'service'> {}

export type AssetDocument =
  | AssetKindDocument<'host'>
  | AssetKindDocument<'pod'>
  | AssetKindDocument<'container'>
  | AssetKindDocument<'service'>
  | AssetKindDocument<'aws_rds'>;
