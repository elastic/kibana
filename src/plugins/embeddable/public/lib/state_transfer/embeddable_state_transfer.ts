/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
    return this.getIncomingState<EmbeddableEditorState>(
      isEmbeddableEditorState,
      appId,
      EMBEDDABLE_EDITOR_STATE_KEY,
      {
        keysToRemoveAfterFetch: removeAfterFetch ? [EMBEDDABLE_EDITOR_STATE_KEY] : undefined,
      }
    );
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
  ): EmbeddablePackageState | undefined {
    return this.getIncomingState<EmbeddablePackageState>(
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
      state: EmbeddableEditorState;
    }
  ): Promise<void> {
    this.isTransferInProgress = true;
    await this.navigateToWithState<EmbeddableEditorState>(appId, EMBEDDABLE_EDITOR_STATE_KEY, {
      ...options,
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
    this.isTransferInProgress = true;
    await this.navigateToWithState<EmbeddablePackageState>(appId, EMBEDDABLE_PACKAGE_STATE_KEY, {
      ...options,
    });
  }

  private getIncomingState<IncomingStateType>(
    guard: (state: unknown) => state is IncomingStateType,
    appId: string,
    key: string,
    options?: {
      keysToRemoveAfterFetch?: string[];
    }
  ): IncomingStateType | undefined {
    const incomingState = this.storage.get(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY)?.[key]?.[appId];
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
    options?: { path?: string; state?: OutgoingStateType; openInNewTab?: boolean }
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
    await this.navigateToApp(appId, { path: options?.path, openInNewTab: options?.openInNewTab });
  }
}
