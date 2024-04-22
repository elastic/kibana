/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  HasEditCapabilities,
  HasParentApi,
  HasType,
  SerializedTitles,
} from '@kbn/presentation-publishing';
import { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { HasLibraryTransforms } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import { PresentationContainer } from '@kbn/presentation-containers';
import { CONTENT_ID } from '../../common';
import { Link, LinksAttributes } from '../../common/content_management';

export type LinksApi = HasType<typeof CONTENT_ID> &
  DefaultEmbeddableApi &
  HasParentApi<Pick<PresentationContainer, 'replacePanel'>> &
  HasEditCapabilities &
  HasLibraryTransforms<LinksSerializedState> & {
    attributes$: BehaviorSubject<LinksAttributes>;
    resolvedLinks$: BehaviorSubject<ResolvedLink[]>;
    savedObjectId$: BehaviorSubject<string | undefined>;
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

// export interface DashboardItem {
//   id: string;
//   attributes: DashboardAttributes;
// }
