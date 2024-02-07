/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  FieldRowKibanaDependencies,
  FieldRowServices,
} from '@kbn/management-settings-components-field-row';
import { UnsavedFieldChange } from '@kbn/management-settings-types';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { I18nStart } from '@kbn/core-i18n-browser';
import { ThemeServiceStart } from '@kbn/core-theme-browser';
import { ToastsStart } from '@kbn/core-notifications-browser';
import { UiSettingsScope } from '@kbn/core-ui-settings-common';

/**
 * Contextual services used by a {@link Form} component.
 */
export interface Services {
  saveChanges: (changes: Record<string, UnsavedFieldChange>, scope: UiSettingsScope) => void;
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
