/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Airdrop, AirdropContent } from '@kbn/airdrops';
import type { Observable } from 'rxjs';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AirdropPluginSetup {}

export interface AirdropPluginStart {
  isDraggingOver$: Observable<boolean>;
  setIsDragging: (isDragging: boolean) => void;
  getAirdrop$ForId: <T>(id: string, app?: string) => Observable<Airdrop<T>>;
  getContents$ForGroup: (group: string, app?: string) => Observable<AirdropContent[]>;
  registerAirdropContent(content: AirdropContent): () => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AppPluginStartDependencies {}
