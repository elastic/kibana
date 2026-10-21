/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { EnhancedAttackEventOverview } from './enhanced_attack_event_overview';

const hit = { id: '1', raw: {}, flattened: {}, isAnchor: false } as DataTableRecord;

describe('EnhancedAttackEventOverview', () => {
  it('renders the overview tab feature with the refresh callback and doc view state', () => {
    const renderFeature = jest.fn().mockReturnValue(<div>AttackOverviewTab</div>);
    const refreshData = jest.fn();
    const initialState = { flyoutV2: [{ kind: 'host', hostName: 'web-01' }] };
    const onInitialStateChange = jest.fn();

    render(
      <EnhancedAttackEventOverview
        hit={hit}
        dataView={dataViewMock}
        overviewTab={{ id: 'security-solution-attack-flyout-overview-tab', render: renderFeature }}
        refreshData={refreshData}
        initialState={initialState}
        onInitialStateChange={onInitialStateChange}
      />
    );

    expect(renderFeature).toHaveBeenCalledWith(
      expect.objectContaining({
        hit,
        onAttackUpdated: refreshData,
        initialState,
        onInitialStateChange,
      })
    );
    expect(screen.getByText('AttackOverviewTab')).toBeInTheDocument();
  });

  it('renders nothing when the overview tab feature is not registered', () => {
    const { container } = render(<EnhancedAttackEventOverview hit={hit} dataView={dataViewMock} />);

    expect(container).toBeEmptyDOMElement();
  });
});
