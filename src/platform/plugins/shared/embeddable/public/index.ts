/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { declareServices, OnStart, type Container } from '@kbn/core-di';
import type { PluginInitializerContext } from '@kbn/core/public';
import { EmbeddableFactoryRegistration } from '@kbn/embeddable-factory-types';
import { EmbeddablePublicPlugin } from './plugin';
import { registerReactEmbeddableFactory } from './react_embeddable_system';
import type { EmbeddableFactory } from './react_embeddable_system';

export type { DrilldownDefinition, DrilldownEditorProps } from './drilldowns/types';

export { useAddFromLibraryTypes } from './add_from_library/registry';
export { PanelNotFoundError, PanelIncompatibleError } from './react_embeddable_system';
export { EmbeddableStateTransfer } from './state_transfer';
export {
  isMultiValueClickTriggerContext,
  isRangeSelectTriggerContext,
  isRowClickTriggerContext,
  isValueClickTriggerContext,
} from './ui_actions/triggers';
export type {
  CellValueContext,
  ChartActionContext,
  MultiValueClickContext,
  RangeSelectContext,
  ValueClickContext,
} from './ui_actions/triggers';
export type { EmbeddableEditorState, EmbeddablePackageState } from './state_transfer';
export type { EmbeddableSetup, EmbeddableStart } from './types';

export {
  EmbeddableRenderer,
  type DefaultEmbeddableApi,
  type EmbeddableFactory,
} from './react_embeddable_system';

export type { DrilldownsManager, HasDrilldowns } from './drilldowns/types';

export type { SerializedDrilldowns } from '../server';

export function plugin(initializerContext: PluginInitializerContext) {
  return new EmbeddablePublicPlugin(initializerContext);
}

/**
 * Collects globally-published embeddable factory registrations.
 *
 * Consumer plugins `publish(EmbeddableFactoryRegistration)` entries globally.
 * At start time, this module collects all entries and populates the internal
 * embeddable factory registry via `registerReactEmbeddableFactory`.
 */
export const services = declareServices(({ bind }) => {
  bind(OnStart).toConstantValue((container: Container) => {
    if (!container.isBound(EmbeddableFactoryRegistration)) {
      return;
    }
    for (const { type, getFactory } of container.getAll(EmbeddableFactoryRegistration)) {
      registerReactEmbeddableFactory(type, getFactory as () => Promise<EmbeddableFactory>);
    }
  });
});

export {
  ADD_PANEL_ANNOTATION_GROUP,
  ADD_PANEL_OTHER_GROUP,
  ADD_PANEL_VISUALIZATION_GROUP,
  ADD_PANEL_LEGACY_GROUP,
} from './ui_actions/add_panel_groups';
