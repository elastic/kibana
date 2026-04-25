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
import { map, Subject } from 'rxjs';
import type { EmbeddableEditorState, EmbeddablePackageState } from './types';
import {
  isEmbeddableEditorState,
  isEmbeddablePackageState,
  EMBEDDABLE_PACKAGE_STATE_KEY,
  EMBEDDABLE_EDITOR_STATE_KEY,
} from './types';

export const EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY = 'EMBEDDABLE_STATE_TRANSFER';

/**
 * The shape of state stored in session storage under {@link EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY}.
 * Top-level keys are state category keys (e.g. 'embeddable_editor_state', 'embeddable_package_state').
 * Each category maps appIds to arrays of state objects validated at read time by type guards.
 */
interface EmbeddableTransferStorageState {
  [stateKey: string]: Record<string, unknown[] | undefined> | undefined;
}

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
  private incomingPackagesState$: Subject<EmbeddableTransferStorageState>;

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
    this.incomingPackagesState$ = new Subject<EmbeddableTransferStorageState>();
  }

  /**
   * Fetches an internationalized app title when given an appId.
   * @param appId - The id of the app to fetch the title for
   */
  public getAppNameFromId = (appId: string): string | undefined => this.appList?.get(appId)?.title;

  private getStorageState(): EmbeddableTransferStorageState | undefined {
    return this.storage.get(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY) as
      | EmbeddableTransferStorageState
      | undefined;
  }

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
    const currentState = this.getStorageState();
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
    state: EmbeddableTransferStorageState,
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
    },
    stateObject?: EmbeddableTransferStorageState
  ): IncomingStateType[] | undefined {
    const embeddableState = stateObject ?? this.getStorageState();
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

  private async navigateToWithState<OutgoingStateType extends unknown[] = unknown[]>(
    appId: string,
    key: string,
    options?: {
      path?: string;
      state?: OutgoingStateType;
      openInNewTab?: boolean;
      skipAppLeave?: boolean;
    }
  ): Promise<void> {
    const stored = this.getStorageState();
    const existingAppState = stored?.[key] || {};
    const stateObject: EmbeddableTransferStorageState = {
      ...stored,
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
    /**
     * If navigateToApp ends up attempting to transfer state to the exact same page that's currently open, it will end up
     * being a no-op. For this case, emit the incoming packages to incomingPackagesState$.
     * If navigateToApp successfully redirects, downstream subscribers will get unsubscribed before receiving the state transfer. It will only
     * affect them in cases where navigateToApp doesn't end up doing anything.
     * Skip emission when opening in a new tab — the state is meant for the new tab, not the current page.
     */
    if (!options?.openInNewTab) {
      this.incomingPackagesState$.next(stateObject);
    }
  }

  public onTransferEmbeddablePackage$(appId: string, removeAfterFetch?: boolean) {
    return this.incomingPackagesState$.pipe(
      map((stateObject) => {
        return this.getIncomingPackagesState<EmbeddablePackageState>(
          isEmbeddablePackageState,
          appId,
          EMBEDDABLE_PACKAGE_STATE_KEY,
          {
            keysToRemoveAfterFetch: removeAfterFetch ? [EMBEDDABLE_PACKAGE_STATE_KEY] : undefined,
          },
          stateObject
        );
      })
    );
  }
}
