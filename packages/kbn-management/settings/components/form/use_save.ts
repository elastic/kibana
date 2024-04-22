/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FieldDefinition } from '@kbn/management-settings-types';
import { isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';
import { UnsavedFieldChange } from '@kbn/management-settings-types';
import { UiSettingsScope } from '@kbn/core-ui-settings-common';
import { useServices } from './services';

export interface UseSaveParameters {
  /** All {@link FieldDefinition} in the form. */
  fields: FieldDefinition[];
  /** The function to invoke for clearing all unsaved changes. */
  clearChanges: () => void;
  /** The {@link UiSettingsScope} of the unsaved changes. */
  scope: UiSettingsScope;
}

/**
 * Hook to provide a function that will save all given {@link UnsavedFieldChange}.
 *
 * @param params The {@link UseSaveParameters} to use.
 * @returns A function that will save all {@link UnsavedFieldChange} that are passed as an argument.
 */
export const useSave = (params: UseSaveParameters) => {
  const { saveChanges, showError, showReloadPagePrompt } = useServices();

  return async (changes: Record<string, UnsavedFieldChange>) => {
    if (isEmpty(changes)) {
      return;
    }
    try {
      await saveChanges(changes, params.scope);
      params.clearChanges();
      const requiresReload = params.fields.some(
        (setting) => changes.hasOwnProperty(setting.id) && setting.requiresPageReload
      );
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
