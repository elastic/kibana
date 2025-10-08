/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UnsavedFieldChanges } from '@kbn/management-settings-types';
import { isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';
import { useServices } from './services';

export interface UseSaveParameters {
  /** The function to invoke for clearing all unsaved changes. */
  clearChanges: () => void;
}

/**
 * Hook to provide a function that will save all given {@link UnsavedFieldChange}.
 *
 * @param params The {@link UseSaveParameters} to use.
 * @returns A function that will save all {@link UnsavedFieldChange} that are passed as an argument.
 */
export const useSave = ({ clearChanges }: UseSaveParameters) => {
  const { saveChanges, showError, showReloadPagePrompt } = useServices();

  return async (changes: UnsavedFieldChanges) => {
    if (isEmpty(changes)) {
      return;
    }
    try {
      await saveChanges(changes);
      clearChanges();
      const requiresReload = Object.values(changes).some((change) => change.needsReload);
      if (requiresReload) {
        showReloadPagePrompt();
      }
    } catch (e) {
      showError(
        i18n.translate('management.settings.form.saveErrorMessage', {
          defaultMessage: 'Unable to save',
        })
      );
    }
  };
};
