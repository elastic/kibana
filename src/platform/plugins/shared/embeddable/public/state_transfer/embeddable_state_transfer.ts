/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { ApplicationStart, PublicAppInfo } from '@kbn/core/public';
import type { EmbeddableEditorState, EmbeddablePackageState } from './types';
import {
  isEmbeddableEditorState,
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
  public isTransferInProgress: boolean;
  private storage: Storage;
  private appList: ReadonlyMap<string, PublicAppInfo> | undefined;

  constructor(
    private navigateToApp: ApplicationStart['navigateToApp'],
    currentAppId$: ApplicationStart['currentAppId$'],
    appList?: ReadonlyMap<string, PublicAppInfo> | undefined,
    customStorage?: Storage
  ) {
    this.storage = customStorage ? customStorage : new Storage(sessionStorage);
    this.isTransferInProgress = false;
    this.appList = appList;
    currentAppId$.subscribe(() => {
      this.isTransferInProgress = false;
    });
  }

  /**
   * Fetches an internationalized app title when given an appId.
   * @param appId - The id of the app to fetch the title for
   */
  public getAppNameFromId = (appId: string): string | undefined => this.appList?.get(appId)?.title;

  /**
   * Fetches an {@link EmbeddableEditorState | editor state} from the sessionStorage for the provided app id
   *
   * @param appId - The app to fetch incomingEditorState for
   * @param removeAfterFetch - Whether to remove the package state after fetch to prevent duplicates.
   */
  public getIncomingEditorState(
    appId: string,
    removeAfterFetch?: boolean
  ): EmbeddableEditorState | undefined {
    const states = this.getIncomingPackagesState<EmbeddableEditorState>(
      isEmbeddableEditorState,
      appId,
      EMBEDDABLE_EDITOR_STATE_KEY,
      {
        keysToRemoveAfterFetch: removeAfterFetch ? [EMBEDDABLE_EDITOR_STATE_KEY] : undefined,
      }
    );
    // warn if states are longer than 1
    if (states && states.length > 1) {
      // eslint-disable-next-line no-console
      console.warn(`Multiple incoming editor states found for appId ${appId}:`, states);
    }
    return states?.[0];
  }

  /**
   * Clears the {@link EmbeddableEditorState | editor state} from the sessionStorage for the provided app id
   *
   * @param appId - The app to fetch incomingEditorState for
   * @param removeAfterFetch - Whether to remove the package state after fetch to prevent duplicates.
   */
  public clearEditorState(appId?: string) {
    const currentState = this.storage.get(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY);
    if (currentState) {
      if (appId) {
        delete currentState[EMBEDDABLE_EDITOR_STATE_KEY]?.[appId];
      } else {
        delete currentState[EMBEDDABLE_EDITOR_STATE_KEY];
      }
      this.storage.set(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY, currentState);
    }
  }

  /**
   * Fetches an {@link EmbeddablePackageState | embeddable package} from the sessionStorage for the given AppId
   *
   * @param appId - The app to fetch EmbeddablePackageState for
   * @param removeAfterFetch - Whether to remove the package state after fetch to prevent duplicates.
   */
  public getIncomingEmbeddablePackage(
    appId: string,
    removeAfterFetch?: boolean
  ): EmbeddablePackageState[] | undefined {
    return this.getIncomingPackagesState<EmbeddablePackageState>(
      isEmbeddablePackageState,
      appId,
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
      openInNewTab?: boolean;
      skipAppLeave?: boolean;
      state: EmbeddableEditorState;
    }
  ): Promise<void> {
    this.isTransferInProgress = true;
    await this.navigateToWithState<EmbeddableEditorState[]>(appId, EMBEDDABLE_EDITOR_STATE_KEY, {
      ...options,
      state: options?.state ? [options.state] : undefined,
    });
  }

  /**
   * A wrapper around the {@link ApplicationStart.navigateToApp} method which navigates to the specified appId
   * with multiple {@link EmbeddablePackageState | embeddable package state}
   */
  public async navigateToWithEmbeddablePackages<SerializedStateType extends object = object>(
    appId: string,
    options?: { path?: string; state: Array<EmbeddablePackageState<SerializedStateType>> }
  ): Promise<void> {
    this.isTransferInProgress = true;
    await this.navigateToWithState<Array<EmbeddablePackageState<SerializedStateType>>>(
      appId,
      EMBEDDABLE_PACKAGE_STATE_KEY,
      {
        ...options,
      }
    );
  }

  private removeKeysFromStorage(
    state: Record<string, any>,
    options?: {
      keysToRemoveAfterFetch?: string[];
    }
  ): void {
    if (options?.keysToRemoveAfterFetch?.length) {
      const stateReplace = { ...state };
      options.keysToRemoveAfterFetch.forEach((keyToRemove: string) => {
        delete stateReplace[keyToRemove];
      });
      this.storage.set(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY, stateReplace);
    }
  }

  /**
   * Retrieves incoming embeddable package states from session storage, handling arrays.
   * Always returns an array format. Filters results using the provided type guard.
   *
   * @param guard - Type guard function to validate state items
   * @param appId - The application ID to fetch state for
   * @param key - The storage key to retrieve state from
   * @param options - Optional configuration including keys to remove after fetch
   * @returns Array of valid package states, or undefined if no valid states found
   */
  private getIncomingPackagesState<IncomingStateType>(
    guard: (state: unknown) => state is IncomingStateType,
    appId: string,
    key: string,
    options?: {
      keysToRemoveAfterFetch?: string[];
    }
  ): IncomingStateType[] | undefined {
    const embeddableState = this.storage.get(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY);
    if (!embeddableState) {
      return undefined;
    }

    const incomingState = embeddableState[key]?.[appId];

    if (!incomingState) {
      return undefined;
    }

    if (Array.isArray(incomingState)) {
      const validStates = incomingState.filter((item) => guard(item));
      if (validStates.length > 0) {
        this.removeKeysFromStorage(embeddableState, options);
        return validStates.map((item) => cloneDeep(item) as IncomingStateType);
      }
      return undefined;
    }

    return undefined;
  }

  private async navigateToWithState<OutgoingStateType = unknown>(
    appId: string,
    key: string,
    options?: {
      path?: string;
      state?: OutgoingStateType;
      openInNewTab?: boolean;
      skipAppLeave?: boolean;
    }
  ): Promise<void> {
    const existingAppState = this.storage.get(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY)?.[key] || {};
    const stateObject = {
      ...this.storage.get(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY),
      [key]: {
        ...existingAppState,
        [appId]: options?.state,
      },
    };
    this.storage.set(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY, stateObject);
    await this.navigateToApp(appId, {
      path: options?.path,
      openInNewTab: options?.openInNewTab,
      skipAppLeave: options?.skipAppLeave,
    });
  }
}
