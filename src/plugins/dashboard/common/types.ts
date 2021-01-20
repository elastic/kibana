/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EmbeddableInput, PanelState } from '../../../../src/plugins/embeddable/common/types';
import { SavedObjectEmbeddableInput } from '../../../../src/plugins/embeddable/common/lib/saved_object_embeddable';
import {
  RawSavedDashboardPanelTo60,
  RawSavedDashboardPanel610,
  RawSavedDashboardPanel620,
  RawSavedDashboardPanel630,
  RawSavedDashboardPanel640To720,
  RawSavedDashboardPanel730ToLatest,
} from './bwc/types';

import { GridData } from './embeddable/types';
export type PanelId = string;
export type SavedObjectId = string;

export interface DashboardPanelState<
  TEmbeddableInput extends EmbeddableInput | SavedObjectEmbeddableInput = SavedObjectEmbeddableInput
> extends PanelState<TEmbeddableInput> {
  readonly gridData: GridData;
}

/**
 * This should always represent the latest dashboard panel shape, after all possible migrations.
 */
export type SavedDashboardPanel = SavedDashboardPanel730ToLatest;

export type SavedDashboardPanel640To720 = Pick<
  RawSavedDashboardPanel640To720,
  Exclude<keyof RawSavedDashboardPanel640To720, 'name'>
> & {
  readonly id: string;
  readonly type: string;
};

export type SavedDashboardPanel630 = Pick<
  RawSavedDashboardPanel630,
  Exclude<keyof RawSavedDashboardPanel620, 'name'>
> & {
  readonly id: string;
  readonly type: string;
};

export type SavedDashboardPanel620 = Pick<
  RawSavedDashboardPanel620,
  Exclude<keyof RawSavedDashboardPanel620, 'name'>
> & {
  readonly id: string;
  readonly type: string;
};

export type SavedDashboardPanel610 = Pick<
  RawSavedDashboardPanel610,
  Exclude<keyof RawSavedDashboardPanel610, 'name'>
> & {
  readonly id: string;
  readonly type: string;
};

export type SavedDashboardPanelTo60 = Pick<
  RawSavedDashboardPanelTo60,
  Exclude<keyof RawSavedDashboardPanelTo60, 'name'>
> & {
  readonly id: string;
  readonly type: string;
};

// id becomes optional starting in 7.3.0
export type SavedDashboardPanel730ToLatest = Pick<
  RawSavedDashboardPanel730ToLatest,
  Exclude<keyof RawSavedDashboardPanel730ToLatest, 'name'>
> & {
  readonly id?: string;
  readonly type: string;
};
