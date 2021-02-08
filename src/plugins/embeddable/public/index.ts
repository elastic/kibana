/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './index.scss';

import { PluginInitializerContext } from 'src/core/public';
import { EmbeddablePublicPlugin } from './plugin';

export {
  ACTION_ADD_PANEL,
  ACTION_EDIT_PANEL,
  Adapters,
  AddPanelAction,
  ReferenceOrValueEmbeddable,
  isReferenceOrValueEmbeddable,
  ChartActionContext,
  Container,
  ContainerInput,
  ContainerOutput,
  CONTEXT_MENU_TRIGGER,
  contextMenuTrigger,
  defaultEmbeddableFactoryProvider,
  EditPanelAction,
  Embeddable,
  EmbeddableChildPanel,
  EmbeddableChildPanelProps,
  EmbeddableContext,
  EmbeddableFactory,
  EmbeddableFactoryDefinition,
  EmbeddableFactoryNotFoundError,
  EmbeddableInput,
  EmbeddableInstanceConfiguration,
  EmbeddableOutput,
  EmbeddablePanel,
  EmbeddableRoot,
  ValueClickContext,
  RangeSelectContext,
  ErrorEmbeddable,
  IContainer,
  IEmbeddable,
  isEmbeddable,
  isErrorEmbeddable,
  openAddPanelFlyout,
  OutputSpec,
  PANEL_BADGE_TRIGGER,
  panelBadgeTrigger,
  PANEL_NOTIFICATION_TRIGGER,
  panelNotificationTrigger,
  PanelNotFoundError,
  PanelState,
  PropertySpec,
  ViewMode,
  withEmbeddableSubscription,
  SavedObjectEmbeddableInput,
  isSavedObjectEmbeddableInput,
  isRangeSelectTriggerContext,
  isValueClickTriggerContext,
  isRowClickTriggerContext,
  isContextMenuTriggerContext,
  EmbeddableStateTransfer,
  EmbeddableEditorState,
  EmbeddablePackageState,
  EmbeddableRenderer,
  EmbeddableRendererProps,
} from './lib';

export { AttributeService, ATTRIBUTE_SERVICE_KEY } from './lib/attribute_service';

export { EnhancementRegistryDefinition } from './types';

export function plugin(initializerContext: PluginInitializerContext) {
  return new EmbeddablePublicPlugin(initializerContext);
}

export {
  EmbeddableSetup,
  EmbeddableStart,
  EmbeddableSetupDependencies,
  EmbeddableStartDependencies,
  EmbeddablePanelHOC,
} from './plugin';
