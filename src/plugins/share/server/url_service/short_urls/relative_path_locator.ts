/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableState } from 'src/plugins/kibana_utils/common';
import type { KibanaLocation, LocatorDefinition } from '../../../common/url_service';

export interface RelativePathLocatorParams extends SerializableState {
  url: string;
}

export class RelativePathLocatorDefinition implements LocatorDefinition<RelativePathLocatorParams> {
  public readonly id = 'RELATIVE_PATH_LOCATOR';

  public async getLocation(params: RelativePathLocatorParams): Promise<KibanaLocation> {
    const { url } = params;

    const match = url.match(/^.*\/app\/([^\/#]+)(.+)$/);

    if (!match) {
      throw new Error('Unexpected URL path.');
    }

    const [, app, path] = match;

    if (!app || !path) {
      throw new Error('Could not parse URL path.');
    }

    return {
      app,
      path,
      state: {},
    };
  }
}
