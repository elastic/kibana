/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Space } from '../../../spaces_oss/common';
import type { SpacesOssPluginStart } from '../../../spaces_oss/public';

export interface SpacesInfo {
  active: Space;
  all: Space[];
}

export const getSpaceInfo = async (
  spaceApi?: SpacesOssPluginStart
): Promise<SpacesInfo | undefined> => {
  if (spaceApi?.isSpacesAvailable) {
    const [active, all] = await Promise.all([spaceApi.getActiveSpace(), spaceApi.getSpaces()]);
    return {
      active,
      all,
    };
  }
  return undefined;
};
