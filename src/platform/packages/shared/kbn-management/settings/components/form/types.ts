/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  FieldRowKibanaDependencies,
  FieldRowServices,
} from '@kbn/management-settings-components-field-row';
import type { UnsavedFieldChanges } from '@kbn/management-settings-types';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
/**
 * Contextual services used by a {@link Form} component.
 */
export interface Services {
  saveChanges: (changes: UnsavedFieldChanges) => void;
  showError: (message: string) => void;
  showReloadPagePrompt: () => void;
}

/**
 * Contextual services used by a {@link Form} component and its dependents.
 */
export type FormServices = FieldRowServices & Services;

/**
 * An interface containing a collection of Kibana plugins and services required to
 * render a {@link Form} component.
 */
interface KibanaDependencies {
  settings: {
    client: Pick<IUiSettingsClient, 'set'>;
    globalClient: Pick<IUiSettingsClient, 'set'>;
  };
  theme: ThemeServiceStart;
  userProfile: UserProfileService;
  i18n: I18nStart;
  /** The portion of the {@link ToastsStart} contract used by this component. */
  notifications: {
    toasts: Pick<ToastsStart, 'addError' | 'add'>;
  };
}

/**
 * An interface containing a collection of Kibana plugins and services required to
 * render a {@link Form} component and its dependents.
 */
export type FormKibanaDependencies = KibanaDependencies & FieldRowKibanaDependencies;
