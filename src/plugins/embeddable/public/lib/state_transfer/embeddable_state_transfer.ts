/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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

  constructor(
    private navigateToApp: ApplicationStart['navigateToApp'],
    currentAppId$: ApplicationStart['currentAppId$'],
    private appList?: ReadonlyMap<string, PublicAppInfo> | undefined,
    customStorage?: Storage
  ) {
    this.storage = customStorage ? customStorage : new Storage(sessionStorage);
    this.isTransferInProgress = false;
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
    if (currentState) {
      delete currentState[EMBEDDABLE_EDITOR_STATE_KEY];
      this.storage.set(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY, currentState);
    }
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
    this.isTransferInProgress = true;
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
    this.isTransferInProgress = true;
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
