/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableOutput } from '@kbn/embeddable-plugin/public';
import { DashboardAttributes } from '@kbn/dashboard-plugin/common';
import { ReduxEmbeddableState } from '@kbn/presentation-util-plugin/public';
import { LinkInput } from '../navigation_container/types';

export interface DashboardLinkInput extends LinkInput {
  dashboardId: string;
}

export interface DashboardLinkComponentState {
  dashboardTitle?: string;
  dashboardDescription?: string; // TODO: Remove this as part of final cleanup if we don't end up using it
}

export interface DashboardItem {
  id: string;
  attributes: DashboardAttributes;
}

export type DashboardLinkReduxState = ReduxEmbeddableState<
  DashboardLinkInput,
  EmbeddableOutput,
  DashboardLinkComponentState
>;
