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
import { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';

import { ControlsServiceType } from './services/controls/types';

export interface CanClearSelections {
  clearSelections: () => void;
}

export const isClearableControl = (control: unknown): control is CanClearSelections => {
  return typeof (control as CanClearSelections).clearSelections === 'function';
};

/**
 * Plugin types
 */
export interface ControlsPluginSetup {
  registerControlType: ControlsServiceType['registerControlType'];
}

export interface ControlsPluginStart {
  getControlFactory: ControlsServiceType['getControlFactory'];
  getControlTypes: ControlsServiceType['getControlTypes'];
}

export interface ControlsPluginSetupDeps {
  embeddable: EmbeddableSetup;
}
export interface ControlsPluginStartDeps {
  uiActions: UiActionsStart;
  embeddable: EmbeddableStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}
