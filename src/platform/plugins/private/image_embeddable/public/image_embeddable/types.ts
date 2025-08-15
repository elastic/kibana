/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HasDynamicActions } from '@kbn/embeddable-enhanced-plugin/public';
import type { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type {
  HasEditCapabilities,
  HasSupportedTriggers,
  SerializedTitles,
} from '@kbn/presentation-publishing';

export type ImageEmbeddableSerializedState = SerializedTitles &
  Partial<DynamicActionsSerializedState> & {
    imageConfig: ImageConfig;
  };

export type ImageEmbeddableApi = DefaultEmbeddableApi<ImageEmbeddableSerializedState> &
  HasEditCapabilities &
  HasSupportedTriggers &
  HasDynamicActions;

export type ImageSizing = 'fill' | 'contain' | 'cover' | 'none';

export interface ImageConfig {
  src: ImageFileSrc | ImageUrlSrc;
  altText?: string;
  sizing: {
    objectFit: ImageSizing;
  };
  backgroundColor?: string;
}

export interface ImageFileSrc {
  type: 'file';
  fileId: string;
  fileImageMeta: {
    blurHash?: string;
    width: number;
    height: number;
  };
}

export interface ImageUrlSrc {
  type: 'url';
  url: string;
}
