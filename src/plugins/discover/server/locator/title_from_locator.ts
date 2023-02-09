/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObject } from '@kbn/core/server';
import { LocatorServicesDeps } from '.';
import { DiscoverAppLocatorParams } from '../../common';

/**
 * @internal
 */
export const titleFromLocatorFactory = (services: LocatorServicesDeps) => {
  /**
   * Allows consumers to derive a title of a search in Disocver from DiscoverAppLocatorParams
   *
   * @public
   */
  const titleFromLocator = async (params: DiscoverAppLocatorParams): Promise<string> => {
    const { savedObjects } = services;
    const searchObject: SavedObject<{ title?: string }> = await savedObjects.get(
      'search',
      params.savedSearchId! // TODO: allow default to DavaView name
    );

    return (params.title ?? searchObject.attributes.title ?? 'Unknown search') as string;
  };

  return titleFromLocator;
};

export type TitleFromLocatorFn = ReturnType<typeof titleFromLocatorFactory>;
