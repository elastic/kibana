/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import useAsyncRetry from 'react-use/lib/useAsyncRetry';
import type {
  IUiSettingsMetadataClient,
  UiSettingsMetadataState,
} from '@kbn/core-ui-settings-browser';
import type { UiSettingsScope } from '@kbn/core-ui-settings-common';

export interface UseSettingDefinitionsParams {
  /** The client the setting definitions (name, description, options, etc.) are fetched from. */
  metadataClient: Pick<IUiSettingsMetadataClient, 'getAll'>;
  /** The scope of the definitions to fetch. */
  scope: UiSettingsScope;
  /** When false, nothing is fetched, and the result is empty and not loading. Defaults to true. */
  isEnabled?: boolean;
}

export interface UseSettingDefinitionsResult {
  /** The setting definitions, keyed by setting ID. Empty until they load. */
  definitions: UiSettingsMetadataState;
  /**
   * True until the definitions first load. A refetch keeps the loaded definitions, so a form
   * built from them stays mounted with its unsaved changes.
   */
  isLoading: boolean;
  /** The error from fetching the definitions, if the latest request failed. */
  loadError?: Error;
  /** Fetches the definitions again, such as from a "Try again" button on the error. */
  retry: () => void;
}

const NO_DEFINITIONS: UiSettingsMetadataState = {};

/**
 * React hook which fetches the full setting definitions for a scope. The definitions are not part
 * of the bootstrap payload, so every page that renders a settings form fetches them this way.
 */
export const useSettingDefinitions = ({
  metadataClient,
  scope,
  isEnabled = true,
}: UseSettingDefinitionsParams): UseSettingDefinitionsResult => {
  const { value, loading, error, retry } = useAsyncRetry(async () => {
    if (!isEnabled) {
      return undefined;
    }
    return metadataClient.getAll(scope);
  }, [metadataClient, scope, isEnabled]);

  // A retry keeps the previous error until it settles, so it is hidden while the request is in flight.
  const loadError = isEnabled && !loading ? error : undefined;

  return {
    definitions: (isEnabled && value) || NO_DEFINITIONS,
    isLoading: isEnabled && loading && !value,
    loadError,
    retry,
  };
};
