/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LocatorDefinition } from '@kbn/share-plugin/public';
import { matchPath } from 'react-router-dom';
import { getHistory } from '../kibana_services';

export class ProfileAwareLocatorDefinition<T extends { profile?: string }>
  implements LocatorDefinition<T>
{
  public readonly id: string;

  constructor(private readonly definition: LocatorDefinition<T>) {
    this.id = definition.id;
  }

  getLocation(params: T) {
    if (params.profile) {
      return this.definition.getLocation(params);
    }

    const history = getHistory();
    const match = matchPath<{ profile: string }>(history.location.pathname, {
      path: '/p/:profile',
    });

    if (match?.params.profile) {
      params = {
        ...params,
        profile: match.params.profile,
      };
    }

    return this.definition.getLocation(params);
  }
}
