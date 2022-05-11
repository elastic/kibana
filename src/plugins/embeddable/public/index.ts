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
  ChartActionContext,
  ContainerInput,
  ContainerOutput,
  EmbeddableChildPanelProps,
  EmbeddableContext,
  EmbeddableFactory,
  EmbeddableFactoryDefinition,
  EmbeddableInput,
  EmbeddableInstanceConfiguration,
  EmbeddableOutput,
  ValueClickContext,
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
  EmbeddableContainerContext,
  EmbeddableContainerSettings,
} from './lib';
export {
  ACTION_ADD_PANEL,
  ACTION_EDIT_PANEL,
  AddPanelAction,
  isReferenceOrValueEmbeddable,
  Container,
  CONTEXT_MENU_TRIGGER,
  contextMenuTrigger,
  defaultEmbeddableFactoryProvider,
  EditPanelAction,
  Embeddable,
  EmbeddableChildPanel,
  EmbeddableFactoryNotFoundError,
  EmbeddablePanel,
  EmbeddableRoot,
  ErrorEmbeddable,
  isEmbeddable,
  isErrorEmbeddable,
  openAddPanelFlyout,
  PANEL_BADGE_TRIGGER,
  panelBadgeTrigger,
  PANEL_NOTIFICATION_TRIGGER,
  panelNotificationTrigger,
  PanelNotFoundError,
  SELECT_RANGE_TRIGGER,
  VALUE_CLICK_TRIGGER,
  ViewMode,
  withEmbeddableSubscription,
  genericEmbeddableInputIsEqual,
  omitGenericEmbeddableInput,
  isSavedObjectEmbeddableInput,
  isRangeSelectTriggerContext,
  isValueClickTriggerContext,
  isRowClickTriggerContext,
  isContextMenuTriggerContext,
  EmbeddableStateTransfer,
  EmbeddableRenderer,
  useEmbeddableFactory,
} from './lib';

export { AttributeService, ATTRIBUTE_SERVICE_KEY } from './lib/attribute_service';

export type { EnhancementRegistryDefinition } from './types';

export function plugin(initializerContext: PluginInitializerContext) {
  return new EmbeddablePublicPlugin(initializerContext);
}

export type {
  EmbeddableSetup,
  EmbeddableStart,
  EmbeddableSetupDependencies,
  EmbeddableStartDependencies,
  EmbeddablePanelHOC,
} from './plugin';
