/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ReactNode } from 'react';
import { MaybePromise } from '@kbn/utility-types';
import { Action, UiActionsService } from '@kbn/ui-actions-plugin/public';

import {
  EditPanelAction,
  RemovePanelAction,
  InspectPanelAction,
  CustomizePanelAction,
} from './panel_actions';
import { EmbeddableError } from '../lib/embeddables/i_embeddable';
import { EmbeddableContext, EmbeddableInput, EmbeddableOutput, IEmbeddable } from '..';

export interface EmbeddableContainerContext {
  /**
   * Current app's path including query and hash starting from {appId}
   */
  getCurrentPath?: () => string;
}

/**
 *   Performance tracking types
 */
export type EmbeddablePhase = 'loading' | 'loaded' | 'rendered' | 'error';
export interface EmbeddablePhaseEvent {
  id: string;
  status: EmbeddablePhase;
  error?: EmbeddableError;
  timeToEvent: number;
}

export type EmbeddableBadgeAction = Action<
  EmbeddableContext<IEmbeddable<EmbeddableInput, EmbeddableOutput>>
>;

export type EmbeddableNotificationAction = Action<
  EmbeddableContext<IEmbeddable<EmbeddableInput, EmbeddableOutput>>
>;

type PanelEmbeddable = IEmbeddable<EmbeddableInput, EmbeddableOutput, MaybePromise<ReactNode>>;

export interface EmbeddablePanelProps {
  showBadges?: boolean;
  showShadow?: boolean;
  hideHeader?: boolean;
  hideInspector?: boolean;
  showNotifications?: boolean;
  containerContext?: EmbeddableContainerContext;
  actionPredicate?: (actionId: string) => boolean;
  onPanelStatusChange?: (info: EmbeddablePhaseEvent) => void;
  getActions?: UiActionsService['getTriggerCompatibleActions'];
  embeddable: PanelEmbeddable | (() => Promise<PanelEmbeddable>);

  /**
   * Ordinal number of the embeddable in the container, used as a
   * "title" when the panel has no title, i.e. "Panel {index}".
   */
  index?: number;
}

export type UnwrappedEmbeddablePanelProps = Omit<EmbeddablePanelProps, 'embeddable'> & {
  embeddable: PanelEmbeddable;
};

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
