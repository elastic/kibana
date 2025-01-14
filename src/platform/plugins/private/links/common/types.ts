/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsResolveResponse } from '@kbn/core-saved-objects-api-server';
import type { SerializedTitles } from '@kbn/presentation-publishing';
import type { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public/plugin';
import { CONTENT_ID } from './constants';
import { LinksAttributes } from './content_management';

export type LinksContentType = typeof CONTENT_ID;

export interface SharingSavedObjectProps {
  outcome: SavedObjectsResolveResponse['outcome'];
  aliasTargetId?: SavedObjectsResolveResponse['alias_target_id'];
  aliasPurpose?: SavedObjectsResolveResponse['alias_purpose'];
  sourceId?: string;
}

export interface LinksByReferenceSerializedState {
  savedObjectId: string;
}

export interface LinksByValueSerializedState {
  attributes: LinksAttributes;
}

export type LinksSerializedState = SerializedTitles &
  Partial<DynamicActionsSerializedState> &
  (LinksByReferenceSerializedState | LinksByValueSerializedState);
