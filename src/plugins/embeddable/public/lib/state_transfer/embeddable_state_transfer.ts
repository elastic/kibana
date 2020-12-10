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

import { cloneDeep } from 'lodash';
import { Storage } from '../../../../kibana_utils/public';
import { ApplicationStart, PublicAppInfo } from '../../../../../core/public';
import {
  EmbeddableEditorState,
  isEmbeddableEditorState,
  EmbeddablePackageState,
  isEmbeddablePackageState,
  EMBEDDABLE_PACKAGE_STATE_KEY,
  EMBEDDABLE_EDITOR_STATE_KEY,
} from './types';

export const EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY = 'EMBEDDABLE_STATE_TRANSFER';

/**
 * A wrapper around the session storage which provides strongly typed helper methods
 * for common incoming and outgoing states used by the embeddable infrastructure.
 *
 * @public
 */
export class EmbeddableStateTransfer {
  private storage: Storage;

  constructor(
    private navigateToApp: ApplicationStart['navigateToApp'],
    private appList?: ReadonlyMap<string, PublicAppInfo> | undefined,
    customStorage?: Storage
  ) {
    this.storage = customStorage ? customStorage : new Storage(sessionStorage);
  }

  /**
   * Fetches an internationalized app title when given an appId.
   * @param appId - The id of the app to fetch the title for
   */
  public getAppNameFromId = (appId: string): string | undefined => this.appList?.get(appId)?.title;

  /**
   * Fetches an {@link EmbeddableEditorState | originating app} argument from the sessionStorage
   *
   * @param removeAfterFetch - Whether to remove the package state after fetch to prevent duplicates.
   */
  public getIncomingEditorState(removeAfterFetch?: boolean): EmbeddableEditorState | undefined {
    return this.getIncomingState<EmbeddableEditorState>(
      isEmbeddableEditorState,
      EMBEDDABLE_EDITOR_STATE_KEY,
      {
        keysToRemoveAfterFetch: removeAfterFetch ? [EMBEDDABLE_EDITOR_STATE_KEY] : undefined,
      }
    );
  }

  public clearEditorState() {
    const currentState = this.storage.get(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY);
    delete currentState[EMBEDDABLE_EDITOR_STATE_KEY];
    this.storage.set(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY, currentState);
  }

  /**
   * Fetches an {@link EmbeddablePackageState | embeddable package} argument from the sessionStorage
   *
   * @param removeAfterFetch - Whether to remove the package state after fetch to prevent duplicates.
   */
  public getIncomingEmbeddablePackage(
    removeAfterFetch?: boolean
  ): EmbeddablePackageState | undefined {
    return this.getIncomingState<EmbeddablePackageState>(
      isEmbeddablePackageState,
      EMBEDDABLE_PACKAGE_STATE_KEY,
      {
        keysToRemoveAfterFetch: removeAfterFetch ? [EMBEDDABLE_PACKAGE_STATE_KEY] : undefined,
      }
    );
  }

  /**
   * A wrapper around the {@link ApplicationStart.navigateToApp} method which navigates to the specified appId
   * with {@link EmbeddableEditorState | embeddable editor state}
   */
  public async navigateToEditor(
    appId: string,
    options?: {
      path?: string;
      state: EmbeddableEditorState;
    }
  ): Promise<void> {
    await this.navigateToWithState<EmbeddableEditorState>(appId, EMBEDDABLE_EDITOR_STATE_KEY, {
      ...options,
      appendToExistingState: true,
    });
  }

  /**
   * A wrapper around the {@link ApplicationStart.navigateToApp} method which navigates to the specified appId
   * with {@link EmbeddablePackageState | embeddable package state}
   */
  public async navigateToWithEmbeddablePackage(
    appId: string,
    options?: { path?: string; state: EmbeddablePackageState }
  ): Promise<void> {
    await this.navigateToWithState<EmbeddablePackageState>(appId, EMBEDDABLE_PACKAGE_STATE_KEY, {
      ...options,
      appendToExistingState: true,
    });
  }

  private getIncomingState<IncomingStateType>(
    guard: (state: unknown) => state is IncomingStateType,
    key: string,
    options?: {
      keysToRemoveAfterFetch?: string[];
    }
  ): IncomingStateType | undefined {
    const incomingState = this.storage.get(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY)?.[key];
    const castState =
      !guard || guard(incomingState) ? (cloneDeep(incomingState) as IncomingStateType) : undefined;
    if (castState && options?.keysToRemoveAfterFetch) {
      const stateReplace = { ...this.storage.get(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY) };
      options.keysToRemoveAfterFetch.forEach((keyToRemove: string) => {
        delete stateReplace[keyToRemove];
      });
      this.storage.set(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY, stateReplace);
    }
    return castState;
  }

  private async navigateToWithState<OutgoingStateType = unknown>(
    appId: string,
    key: string,
    options?: { path?: string; state?: OutgoingStateType; appendToExistingState?: boolean }
  ): Promise<void> {
    const stateObject = options?.appendToExistingState
      ? {
          ...this.storage.get(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY),
          [key]: options.state,
        }
      : { [key]: options?.state };
    this.storage.set(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY, stateObject);
    await this.navigateToApp(appId, { path: options?.path });
  }
}
