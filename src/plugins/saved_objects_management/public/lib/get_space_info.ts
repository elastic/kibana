/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Space } from '../../../../../x-pack/plugins/spaces/common';
import type { SpacesReactContextValue } from '../../../../../x-pack/plugins/spaces/public';

export interface SpacesInfo {
  active: Space;
  all: Space[];
}

export const getSpaceInfo = async (
  spaceApi?: SpacesReactContextValue<any>
): Promise<SpacesInfo | undefined> => {
  if (spaceApi) {
    const [active, all] = await Promise.all([
      spaceApi.spacesManager.getActiveSpace(),
      spaceApi.spacesManager.getSpaces(),
    ]);
    return {
      active,
      all,
    };
  }
  return undefined;
};
