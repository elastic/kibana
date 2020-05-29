/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { cloneDeep, forOwn } from 'lodash';
import { CoreStart, ScopedHistory } from '../../../../../core/public';
import {
  EmbeddableOriginatingAppState,
  isEmbeddableOriginatingAppState,
  EmbeddablePackageState,
  isEmbeddablePackageState,
} from './types';

export class EmbeddableStateTransfer {
  constructor(private coreStart: CoreStart) {}

  public incomingOriginatingApp(
    history: ScopedHistory,
    removeAfterFetch: boolean = false
  ): EmbeddableOriginatingAppState | undefined {
    return this.incoming<EmbeddableOriginatingAppState>(
      history,
      isEmbeddableOriginatingAppState,
      removeAfterFetch
    );
  }

  public incomingEmbeddablePackage(
    history: ScopedHistory,
    removeAfterFetch: boolean = false
  ): EmbeddablePackageState | undefined {
    return this.incoming<EmbeddablePackageState>(
      history,
      isEmbeddablePackageState,
      removeAfterFetch
    );
  }

  public incoming<IncomingStateType>(
    history: ScopedHistory,
    guard: (state: unknown) => state is IncomingStateType,
    removeAfterFetch: boolean = false
  ): IncomingStateType | undefined {
    const incomingState = history?.location?.state;
    const castState =
      !guard || guard(incomingState) ? (cloneDeep(incomingState) as IncomingStateType) : undefined;
    if (castState && removeAfterFetch) {
      Object.keys(castState).forEach((key: string) => {
        delete (history.location.state as { [key: string]: unknown })[key];
      });
    }
    return castState;
  }

  public async outgoingOriginatingApp(
    appId: string,
    options: { path?: string; state: EmbeddableOriginatingAppState }
  ): Promise<void> {
    await this.outgoing<EmbeddableOriginatingAppState>(appId, options);
  }

  public async outgoingEmbeddablePackage(
    appId: string,
    options: { path?: string; state: EmbeddablePackageState }
  ): Promise<void> {
    await this.outgoing<EmbeddablePackageState>(appId, options);
  }

  public async outgoing<OutgoingStateType = unknown>(
    appId: string,
    options: { path?: string; state?: OutgoingStateType }
  ): Promise<void> {
    await this.coreStart.application.navigateToApp(appId, options);
  }
}
