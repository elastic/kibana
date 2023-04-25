/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { GroupStats } from './group_stats';

const onTakeActionsOpen = jest.fn();
const testProps = {
  bucketKey: '9nk5mo2fby',
  groupFilter: [],
  groupNumber: 0,
  onTakeActionsOpen,
  statRenderers: [
    {
      title: 'Severity',
      renderer: <p data-test-subj="customMetricStat" />,
    },
    { title: "IP's:", badge: { value: 1 } },
    { title: 'Rules:', badge: { value: 2 } },
    { title: 'Alerts:', badge: { value: 2, width: 50, color: '#a83632' } },
  ],
  takeActionItems: () => [
    <p data-test-subj="takeActionItem-1" key={1} />,
    <p data-test-subj="takeActionItem-2" key={2} />,
  ],
};
describe('Group stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders each stat item', () => {
    const { getByTestId, queryByTestId } = render(<GroupStats {...testProps} />);
    expect(getByTestId('group-stats')).toBeInTheDocument();
    testProps.statRenderers.forEach(({ title: stat, renderer }) => {
      if (renderer != null) {
        expect(getByTestId(`customMetric-${stat}`)).toBeInTheDocument();
        expect(queryByTestId(`metric-${stat}`)).not.toBeInTheDocument();
      } else {
        expect(getByTestId(`metric-${stat}`)).toBeInTheDocument();
        expect(queryByTestId(`customMetric-${stat}`)).not.toBeInTheDocument();
      }
    });
  });
  it('when onTakeActionsOpen is defined, call onTakeActionsOpen on popover click', () => {
    const { getByTestId, queryByTestId } = render(<GroupStats {...testProps} />);
    fireEvent.click(getByTestId('take-action-button'));
    expect(onTakeActionsOpen).toHaveBeenCalled();
    ['takeActionItem-1', 'takeActionItem-2'].forEach((actionItem) => {
      expect(queryByTestId(actionItem)).not.toBeInTheDocument();
    });
  });
  it('when onTakeActionsOpen is undefined, render take actions dropdown on popover click', () => {
    const { getByTestId } = render(<GroupStats {...testProps} onTakeActionsOpen={undefined} />);
    fireEvent.click(getByTestId('take-action-button'));
    ['takeActionItem-1', 'takeActionItem-2'].forEach((actionItem) => {
      expect(getByTestId(actionItem)).toBeInTheDocument();
    });
  });
});
