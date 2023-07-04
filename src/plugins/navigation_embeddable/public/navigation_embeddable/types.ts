/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ReduxEmbeddableState } from '@kbn/presentation-util-plugin/public';
import {
  PanelState,
  IEmbeddable,
  ContainerInput,
  ContainerOutput,
  EmbeddableInput,
  EmbeddableOutput,
  EmbeddableFactory,
} from '@kbn/embeddable-plugin/public';

// export type LinkDestination = DashboardLinkDestination | ExternalLinkDestination;
export interface LinkInput extends EmbeddableInput {
  label?: string;
}

export type LinkEmbeddable<
  I extends LinkInput = LinkInput,
  O extends EmbeddableOutput = EmbeddableOutput
> = IEmbeddable<I, O>;

export type LinkFactory<I extends LinkInput = LinkInput> = EmbeddableFactory<
  I,
  EmbeddableOutput,
  LinkEmbeddable<I>
>;

export interface ILinkFactory<I extends LinkInput = LinkInput>
  extends Pick<EmbeddableFactory, 'type'> {
  linkEditorDestinationComponent?: (props: LinkEditorDestinationProps<I>) => JSX.Element;
}

export interface LinkEditorDestinationProps<I extends LinkInput = LinkInput> {
  initialInput?: Partial<I>;
  onChange: (partial: Partial<I>) => void;
  setPlaceholder: (placeholder: string | undefined) => void;
  currentDashboardId?: string;
}

export interface LinkPanelState<TEmbeddableInput extends LinkInput = LinkInput>
  extends PanelState<TEmbeddableInput> {
  order: number;
}

export interface LinkPanels {
  [panelId: string]: LinkPanelState;
}

/**
 * Explicit Input
 */

export interface NavigationContainerInput extends EmbeddableInput, ContainerInput {
  panels: LinkPanels;
}

/**
 * Redux state
 */
export interface NavigationContainerComponentState {
  totalDashboards?: number;
  currentDashboardId?: string;
}

export type NavigationContainerReduxState = ReduxEmbeddableState<
  NavigationContainerInput,
  ContainerOutput,
  NavigationContainerComponentState
>;
