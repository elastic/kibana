/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PersistableState, SerializableState } from 'src/plugins/kibana_utils/common';
import { LocatorDefinition, LocatorPublic, KibanaLocation } from './types';

export abstract class AbstractLocator<P extends SerializableState>
  implements PersistableState<P>, LocatorPublic<P> {
  public readonly migrations: PersistableState<P>['migrations'];

  constructor(public readonly definition: LocatorDefinition<P>) {
    this.migrations = definition.migrations || {};
  }

  // PersistableState<P> -------------------------------------------------------

  public readonly telemetry: PersistableState<P>['telemetry'] = () => {
    throw new Error('not implemented');
  };

  public readonly inject: PersistableState<P>['inject'] = () => {
    throw new Error('not implemented');
  };

  public readonly extract: PersistableState<P>['extract'] = () => {
    throw new Error('not implemented');
  };

  // LocatorPublic<P> ----------------------------------------------------------

  public getLocation(params: P): KibanaLocation {
    return this.definition.getLocation(params);
  }

  public navigate(params: P): void {
    throw new Error('not implemented');
  }
}
