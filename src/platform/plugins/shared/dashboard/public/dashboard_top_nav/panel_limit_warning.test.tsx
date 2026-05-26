/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import type { PanelLimitState } from '../dashboard_api/panel_limit_validator';
import { DashboardInternalContext } from '../dashboard_api/use_dashboard_internal_api';
import type { DashboardInternalApi } from '../dashboard_api/types';
import { PanelLimitWarning } from './panel_limit_warning';

describe('PanelLimitWarning', () => {
  const render = (state: PanelLimitState) => {
    return renderWithI18n(
      <DashboardInternalContext.Provider
        value={{
          panelLimitState$: new BehaviorSubject(state),
        } as unknown as Pick<DashboardInternalApi, 'panelLimitState$'>}
      >
        <PanelLimitWarning />
      </DashboardInternalContext.Provider>
    );
  };

  it('renders nothing when dashboard is valid', () => {
    render({
      isValid: true,
      topLevel: { count: 0, max: 100, exceeded: false },
      pinnedPanels: { count: 0, max: 100, exceeded: false },
      sectionViolations: [],
    });

    expect(document.querySelector('[data-test-subj="dashboardPanelLimitWarning"]')).toBeNull();
  });

  it('renders when dashboard is invalid', () => {
    render({
      isValid: false,
      topLevel: { count: 101, max: 100, exceeded: true },
      pinnedPanels: { count: 0, max: 100, exceeded: false },
      sectionViolations: [],
    });

    expect(document.querySelector('[data-test-subj="dashboardPanelLimitWarning"]')).not.toBeNull();
  });
});
