/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  apiIsOfType,
  HasEditCapabilities,
  HasType,
  SerializedTitles,
} from '@kbn/presentation-publishing';
import { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { HasLibraryTransforms, apiHasLibraryTransforms } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import { CONTENT_ID } from '../../common';
import { Link, LinksAttributes, LinksLayoutType } from '../../common/content_management';

export type LinksApi = HasType<typeof CONTENT_ID> &
  DefaultEmbeddableApi &
  HasEditCapabilities &
  HasLibraryTransforms<LinksSerializedState> & {
    links$: BehaviorSubject<Link[] | undefined>;
    layout$: BehaviorSubject<LinksLayoutType | undefined>;
    resolvedLinks$: BehaviorSubject<ResolvedLink[]>;
    savedObjectId$: BehaviorSubject<string | undefined>;
  };

export const isLinksApi = (api: unknown): api is LinksApi => {
  return Boolean(api && apiIsOfType(api, CONTENT_ID) && apiHasLibraryTransforms(api));
};

export interface LinksSerializedState extends SerializedTitles, Partial<LinksAttributes> {
  attributes?: LinksAttributes;
  savedObjectId?: string;
}

export type ResolvedLink = Link & {
  title: string;
  description?: string;
  error?: Error;
};
