/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiTourStep, EuiButton } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { discoverServiceMock } from '../../__mocks__/services';
import { DiscoverTourProvider } from './discover_tour_provider';
import { useDiscoverTourContext } from './discover_tour_context';
import { DISCOVER_TOUR_STEP_ANCHORS } from './discover_tour_anchors';
import { DiscoverMainProvider } from '../../application/main/state_management/discover_state_provider';
import { getDiscoverStateMock } from '../../__mocks__/discover_state.mock';

describe('Discover tour', () => {
  const mountComponent = (innerContent: JSX.Element) => {
    return mountWithIntl(
      <KibanaContextProvider services={discoverServiceMock}>
        <DiscoverMainProvider value={getDiscoverStateMock({})}>
          <DiscoverTourProvider>{innerContent}</DiscoverTourProvider>
        </DiscoverMainProvider>
      </KibanaContextProvider>
    );
  };

  it('should start successfully', () => {
    const buttonSubjToTestStart = 'discoverTourButtonTestStart';
    const InnerComponent = () => {
      const tourContext = useDiscoverTourContext();

      return (
        <EuiButton onClick={tourContext.onStartTour} data-test-subj={buttonSubjToTestStart}>
          {'Start the tour'}
        </EuiButton>
      );
    };

    const component = mountComponent(<InnerComponent />);
    // all steps are hidden by default
    expect(component.find(EuiTourStep)).toHaveLength(0);

    // one step should become visible after the tour is triggered
    component.find(`button[data-test-subj="${buttonSubjToTestStart}"]`).at(0).simulate('click');

    expect(component.find(EuiTourStep)).toHaveLength(5);
    expect(
      component.find({ anchor: DISCOVER_TOUR_STEP_ANCHORS.addFields, isStepOpen: true })
    ).toHaveLength(1);
    expect(
      component.find({ anchor: DISCOVER_TOUR_STEP_ANCHORS.reorderColumns, isStepOpen: false })
    ).toHaveLength(1);
    expect(
      component.find({ anchor: DISCOVER_TOUR_STEP_ANCHORS.sort, isStepOpen: false })
    ).toHaveLength(1);
    expect(
      component.find({ anchor: DISCOVER_TOUR_STEP_ANCHORS.changeRowHeight, isStepOpen: false })
    ).toHaveLength(1);
    expect(
      component.find({ anchor: DISCOVER_TOUR_STEP_ANCHORS.expandDocument, isStepOpen: false })
    ).toHaveLength(1);
  });
});
