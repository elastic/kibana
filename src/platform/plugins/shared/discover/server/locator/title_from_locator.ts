/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { SavedObject } from '@kbn/core/server';
import { LocatorServicesDeps } from '.';
import { DiscoverAppLocatorParams } from '../../common';

/**
 * @internal
 */
export const titleFromLocatorFactory = (services: LocatorServicesDeps) => {
  /**
   * Allows consumers to derive a title of a search in Disocver from DiscoverAppLocatorParams.
   * For now, this assumes the DiscoverAppLocatorParams contain a reference to a saved search. In the future,
   * the params may only contain a reference to a DataView
   *
   * @public
   */
  const titleFromLocator = async (params: DiscoverAppLocatorParams): Promise<string> => {
    const { savedSearchId, title: paramsTitle } = params as {
      savedSearchId?: string;
      title?: string;
    };

    if (paramsTitle) {
      return paramsTitle;
    }

    if (!savedSearchId) {
      throw new Error(`DiscoverAppLocatorParams must contain a saved search reference`);
    }

    const { savedObjects } = services;
    const searchObject: SavedObject<{ title?: string }> = await savedObjects.get(
      'search',
      savedSearchId // assumes params contains saved search reference
    );

    return (
      searchObject.attributes.title ??
      i18n.translate('discover.serverLocatorExtension.titleFromLocatorUnknown', {
        defaultMessage: 'Unknown search',
      })
    );
  };

  return titleFromLocator;
};

export type TitleFromLocatorFn = ReturnType<typeof titleFromLocatorFactory>;
