/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Action } from '@kbn/ui-actions-plugin/public';
import {
  EditPanelAction,
  EmbeddableContainerContext,
  EmbeddableContext,
  EmbeddableInput,
  EmbeddableOutput,
  IEmbeddable,
} from '..';
import { CustomizePanelAction, InspectPanelAction, RemovePanelAction } from '../lib';

export type EmbeddableBadgeAction = Action<
  EmbeddableContext<IEmbeddable<EmbeddableInput, EmbeddableOutput>>
>;

export type EmbeddableNotificationAction = Action<
  EmbeddableContext<IEmbeddable<EmbeddableInput, EmbeddableOutput>>
>;

export interface EmbeddablePanelProps {
  showBadges?: boolean;
  showShadow?: boolean;
  hideHeader?: boolean;
  embeddable: IEmbeddable;
  showNotifications?: boolean;
  containerContext?: EmbeddableContainerContext;
  actionPredicate?: (actionId: string) => boolean;

  /**
   * Ordinal number of the embeddable in the container, used as a
   * "title" when the panel has no title, i.e. "Panel {index}".
   */
  index?: number;
}

export interface InspectorPanelAction {
  inspectPanel: InspectPanelAction;
}

export interface BasePanelActions {
  customizePanel: CustomizePanelAction;
  inspectPanel: InspectPanelAction;
  removePanel: RemovePanelAction;
  editPanel: EditPanelAction;
}

export interface PanelUniversalActions
  extends Partial<InspectorPanelAction>,
    Partial<BasePanelActions> {}
