/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apiIsOfType, HasType } from '@kbn/presentation-publishing';
import {
  DefaultEmbeddableApi,
  SerializedReactEmbeddableTitles,
} from '@kbn/embeddable-plugin/public';
import {
  apiCanLinkToLibrary,
  apiCanUnlinkFromLibrary,
  CanLinkToLibrary,
  CanUnlinkFromLibrary,
} from '@kbn/presentation-library';
import { CONTENT_ID } from '../../common';
import { LinksAttributes } from '../../common/content_management';

export type LinksApi = HasType<typeof CONTENT_ID> &
  DefaultEmbeddableApi &
  CanLinkToLibrary &
  CanUnlinkFromLibrary;

export const isLinksApi = (api: unknown): api is LinksApi => {
  return Boolean(
    api && apiIsOfType(api, CONTENT_ID) && apiCanUnlinkFromLibrary(api) && apiCanLinkToLibrary(api)
  );
};

export interface LinksSerializableState
  extends SerializedReactEmbeddableTitles,
    Partial<LinksAttributes> {
  attributes?: LinksAttributes;
}
