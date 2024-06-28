/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Airdrop } from '@kbn/airdrops';
import type { Observable } from 'rxjs';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AirdropPluginSetup {}

export interface AirdropPluginStart {
  isDraggingOver$: Observable<boolean>;
  setIsDragging: (isDragging: boolean) => void;
  getAirdrop$For: <T>(id: string, app?: string) => Observable<Airdrop<T>>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AppPluginStartDependencies {}
