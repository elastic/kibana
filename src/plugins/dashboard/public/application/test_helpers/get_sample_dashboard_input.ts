/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DashboardContainerInput } from '../..';
import { DashboardPanelState } from '../embeddable';
import { ViewMode, EmbeddableInput } from '../../services/embeddable';

export function getSampleDashboardInput(
  overrides?: Partial<DashboardContainerInput>
): DashboardContainerInput {
  return {
    id: '123',
    filters: [],
    useMargins: false,
    isEmbeddedExternally: false,
    isFullScreenMode: false,
    title: 'My Dashboard',
    query: {
      language: 'kuery',
      query: 'hi',
    },
    timeRange: {
      to: 'now',
      from: 'now-15m',
    },
    timeRestore: false,
    viewMode: ViewMode.VIEW,
    panels: {},
    ...overrides,
  };
}

export function getSampleDashboardPanel<TEmbeddableInput extends EmbeddableInput = EmbeddableInput>(
  overrides: Partial<DashboardPanelState<TEmbeddableInput>> & {
    explicitInput: { id: string };
    type: string;
  }
): DashboardPanelState {
  return {
    gridData: {
      h: 15,
      w: 15,
      x: 0,
      y: 0,
      i: overrides.explicitInput.id,
    },
    ...overrides,
  };
}
