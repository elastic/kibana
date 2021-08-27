/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PluginInitializerContext } from '../../../core/public/plugins/plugin_context';
import './index.scss';
import { EmbeddablePublicPlugin } from './plugin';

export {
  ACTION_ADD_PANEL,
  ACTION_EDIT_PANEL,
  Adapters,
  AddPanelAction,
  ChartActionContext,
  Container,
  ContainerInput,
  ContainerOutput,
  contextMenuTrigger,
  CONTEXT_MENU_TRIGGER,
  defaultEmbeddableFactoryProvider,
  EditPanelAction,
  Embeddable,
  EmbeddableChildPanel,
  EmbeddableChildPanelProps,
  EmbeddableContext,
  EmbeddableEditorState,
  EmbeddableFactory,
  EmbeddableFactoryDefinition,
  EmbeddableFactoryNotFoundError,
  EmbeddableInput,
  EmbeddableInstanceConfiguration,
  EmbeddableOutput,
  EmbeddablePackageState,
  EmbeddablePanel,
  EmbeddableRenderer,
  EmbeddableRendererProps,
  EmbeddableRoot,
  EmbeddableStateTransfer,
  ErrorEmbeddable,
  IContainer,
  IEmbeddable,
  isContextMenuTriggerContext,
  isEmbeddable,
  isErrorEmbeddable,
  isRangeSelectTriggerContext,
  isReferenceOrValueEmbeddable,
  isRowClickTriggerContext,
  isSavedObjectEmbeddableInput,
  isValueClickTriggerContext,
  openAddPanelFlyout,
  OutputSpec,
  panelBadgeTrigger,
  PanelNotFoundError,
  panelNotificationTrigger,
  PanelState,
  PANEL_BADGE_TRIGGER,
  PANEL_NOTIFICATION_TRIGGER,
  PropertySpec,
  RangeSelectContext,
  ReferenceOrValueEmbeddable,
  SavedObjectEmbeddableInput,
  SELECT_RANGE_TRIGGER,
  useEmbeddableFactory,
  ValueClickContext,
  VALUE_CLICK_TRIGGER,
  ViewMode,
  withEmbeddableSubscription,
} from './lib';
export { AttributeService, ATTRIBUTE_SERVICE_KEY } from './lib/attribute_service';
export {
  EmbeddablePanelHOC,
  EmbeddableSetup,
  EmbeddableSetupDependencies,
  EmbeddableStart,
  EmbeddableStartDependencies,
} from './plugin';
export { EnhancementRegistryDefinition } from './types';

export function plugin(initializerContext: PluginInitializerContext) {
  return new EmbeddablePublicPlugin(initializerContext);
}
