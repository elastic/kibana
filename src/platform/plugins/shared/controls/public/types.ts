/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { PublishingSubject } from '@kbn/presentation-publishing';

export interface CanClearSelections {
  clearSelections: () => void;
  hasSelections$: PublishingSubject<boolean | undefined>;
}

export const isClearableControl = (control: unknown): control is CanClearSelections => {
  return (
    typeof (control as CanClearSelections).clearSelections === 'function' &&
    Boolean((control as CanClearSelections).hasSelections$)
  );
};

export interface CanClearVariables {
  clearVariables: () => void;
}

export const isVariablesControl = (control: unknown): control is CanClearVariables => {
  return typeof (control as CanClearVariables).clearVariables === 'function';
};

/**
 * Plugin types
 */
export interface ControlsPluginSetupDeps {
  embeddable: EmbeddableSetup;
}
export interface ControlsPluginStartDeps {
  uiActions: UiActionsStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
}
