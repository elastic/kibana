/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from '@kbn/core/public';
import { EmbeddablePublicPlugin } from './plugin';

export { openAddPanelFlyout } from './add_panel_flyout/open_add_panel_flyout';
export { EmbeddablePanel } from './embeddable_panel';
export {
  cellValueTrigger,
  CELL_VALUE_TRIGGER,
  Container,
  contextMenuTrigger,
  CONTEXT_MENU_TRIGGER,
  defaultEmbeddableFactoryProvider,
  Embeddable,
  EmbeddableFactoryNotFoundError,
  EmbeddableRenderer,
  EmbeddableRoot,
  EmbeddableStateTransfer,
  ErrorEmbeddable,
  genericEmbeddableInputIsEqual,
  isContextMenuTriggerContext,
  isEmbeddable,
  isErrorEmbeddable,
  isExplicitInputWithAttributes,
  isFilterableEmbeddable,
  isMultiValueClickTriggerContext,
  isRangeSelectTriggerContext,
  isReferenceOrValueEmbeddable,
  isRowClickTriggerContext,
  isSavedObjectEmbeddableInput,
  isValueClickTriggerContext,
  MULTI_VALUE_CLICK_TRIGGER,
  omitGenericEmbeddableInput,
  panelBadgeTrigger,
  panelHoverTrigger,
  PanelNotFoundError,
  PanelIncompatibleError,
  panelNotificationTrigger,
  PANEL_BADGE_TRIGGER,
  PANEL_HOVER_TRIGGER,
  PANEL_NOTIFICATION_TRIGGER,
  runEmbeddableFactoryMigrations,
  SELECT_RANGE_TRIGGER,
  shouldFetch$,
  shouldRefreshFilterCompareOptions,
  useEmbeddableFactory,
  VALUE_CLICK_TRIGGER,
  ViewMode,
  withEmbeddableSubscription,
} from './lib';
export type {
  Adapters,
  CellValueContext,
  ChartActionContext,
  ContainerInput,
  ContainerOutput,
  EmbeddableAppContext,
  EmbeddableContainerSettings,
  EmbeddableContext,
  EmbeddableEditorState,
  EmbeddableFactory,
  EmbeddableFactoryDefinition,
  EmbeddableInput,
  EmbeddableInstanceConfiguration,
  EmbeddableOutput,
  EmbeddablePackageState,
  EmbeddableRendererProps,
  FilterableEmbeddable,
  IContainer,
  IEmbeddable,
  MultiValueClickContext,
  OutputSpec,
  PanelState,
  PropertySpec,
  RangeSelectContext,
  ReferenceOrValueEmbeddable,
  SavedObjectEmbeddableInput,
  SelfStyledEmbeddable,
  ValueClickContext,
} from './lib';
export { AttributeService, ATTRIBUTE_SERVICE_KEY } from './lib/attribute_service';
export type {
  EmbeddableSetup,
  EmbeddableSetupDependencies,
  EmbeddableStart,
  EmbeddableStartDependencies,
} from './plugin';
export type { EnhancementRegistryDefinition } from './types';

export {
  ReactEmbeddableRenderer,
  reactEmbeddableRegistryHasKey,
  registerReactEmbeddableFactory,
  type DefaultEmbeddableApi,
  type ReactEmbeddableFactory,
  type ReactEmbeddableRegistration,
  startTrackingEmbeddableUnsavedChanges,
} from './react_embeddable_system';

export { registerSavedObjectToPanelMethod } from './registry/saved_object_to_panel_methods';

export function plugin(initializerContext: PluginInitializerContext) {
  return new EmbeddablePublicPlugin(initializerContext);
}

export {
  embeddableInputToSubject,
  embeddableOutputToSubject,
} from './lib/embeddables/compatibility/embeddable_compatibility_utils';
