/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Observable } from 'rxjs';

/**
 * A list of services that are consumed by this component.
 * @public
 */
export interface AirdropServices {
  isDraggingOver$: Observable<boolean>;
  setIsDragging: (isDragging: boolean) => void;
  getAirdrop$For: <T extends Record<string, unknown>>(
    id: string,
    app?: string
  ) => Observable<Airdrop<T>>;
}

/**
 * An interface containing a collection of Kibana dependencies required to
 * render this component
 * @public
 */
export interface KibanaDependencies {
  /** AirdropPluginStart contract  */
  airdrop: {
    isDraggingOver$: Observable<boolean>;
    setIsDragging: (isDragging: boolean) => void;
    getAirdrop$For: <T extends Record<string, unknown>>(
      id: string,
      app?: string
    ) => Observable<Airdrop<T>>;
  };
}

export interface Airdrop<T = Record<string, unknown>> {
  id: string;
  app?: string;
  content: T;
}
