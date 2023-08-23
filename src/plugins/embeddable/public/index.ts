/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './index.scss';

import { PluginInitializerContext } from '@kbn/core/public';
import { EmbeddablePublicPlugin } from './plugin';

export type {
  Adapters,
  ReferenceOrValueEmbeddable,
  SelfStyledEmbeddable,
  FilterableEmbeddable,
  ChartActionContext,
  ContainerInput,
  ContainerOutput,
  EmbeddableContext,
  EmbeddableFactory,
  EmbeddableFactoryDefinition,
  EmbeddableInput,
  EmbeddableInstanceConfiguration,
  EmbeddableOutput,
  ValueClickContext,
  MultiValueClickContext,
  CellValueContext,
  RangeSelectContext,
  IContainer,
  IEmbeddable,
  OutputSpec,
  PanelState,
  PropertySpec,
  SavedObjectEmbeddableInput,
  EmbeddableEditorState,
  EmbeddablePackageState,
  EmbeddableRendererProps,
  EmbeddableContainerSettings,
} from './lib';
export {
  isReferenceOrValueEmbeddable,
  Container,
  CONTEXT_MENU_TRIGGER,
  contextMenuTrigger,
  defaultEmbeddableFactoryProvider,
  Embeddable,
  EmbeddableFactoryNotFoundError,
  EmbeddableRoot,
  ErrorEmbeddable,
  isEmbeddable,
  isErrorEmbeddable,
  PANEL_BADGE_TRIGGER,
  panelBadgeTrigger,
  PANEL_NOTIFICATION_TRIGGER,
  panelNotificationTrigger,
  PanelNotFoundError,
  SELECT_RANGE_TRIGGER,
  VALUE_CLICK_TRIGGER,
  MULTI_VALUE_CLICK_TRIGGER,
  CELL_VALUE_TRIGGER,
  cellValueTrigger,
  ViewMode,
  withEmbeddableSubscription,
  genericEmbeddableInputIsEqual,
  omitGenericEmbeddableInput,
  isSavedObjectEmbeddableInput,
  isRangeSelectTriggerContext,
  isValueClickTriggerContext,
  isMultiValueClickTriggerContext,
  isRowClickTriggerContext,
  isContextMenuTriggerContext,
  EmbeddableStateTransfer,
  EmbeddableRenderer,
  useEmbeddableFactory,
  isFilterableEmbeddable,
  shouldFetch$,
  shouldRefreshFilterCompareOptions,
  PANEL_HOVER_TRIGGER,
  panelHoverTrigger,
} from './lib';

export { EmbeddablePanel } from './embeddable_panel';
export {
  InspectPanelAction,
  ACTION_INSPECT_PANEL,
  CustomizePanelAction,
  ACTION_CUSTOMIZE_PANEL,
  EditPanelAction,
  ACTION_EDIT_PANEL,
  RemovePanelAction,
  REMOVE_PANEL_ACTION,
  tracksOverlays,
} from './embeddable_panel/panel_actions';

export type {
  EmbeddablePhase,
  EmbeddablePhaseEvent,
  EmbeddableContainerContext,
} from './embeddable_panel/types';

export { AttributeService, ATTRIBUTE_SERVICE_KEY } from './lib/attribute_service';

export type { EnhancementRegistryDefinition } from './types';

export function plugin(initializerContext: PluginInitializerContext) {
  return new EmbeddablePublicPlugin(initializerContext);
}

export { openAddPanelFlyout } from './add_panel_flyout/open_add_panel_flyout';

export type {
  EmbeddableSetup,
  EmbeddableStart,
  EmbeddableSetupDependencies,
  EmbeddableStartDependencies,
} from './plugin';
