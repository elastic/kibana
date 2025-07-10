/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { ExtraActionsButton } from './extra_actions_button';

describe('ExtraActionsButton', () => {
  it('renders', () => {
    const { queryByTestId, container } = render(
      <ExtraActionsButton onClick={() => {}} showTooltip={false} />
    );

    expect(queryByTestId('showExtraActionsButton')).toBeInTheDocument();
    expect(container.querySelector('[data-euiicon-type="boxesHorizontal"]')).toBeInTheDocument();
  });

  it('renders tooltip when showTooltip=true is received', () => {
    const { container } = render(<ExtraActionsButton onClick={() => {}} showTooltip />);
    expect(container.querySelector('.euiToolTipAnchor')).not.toBeNull();
  });

  it('calls onClick when button is clicked', () => {
    const onClick = jest.fn();
    const { getByTestId } = render(<ExtraActionsButton onClick={onClick} showTooltip />);

    fireEvent.click(getByTestId('showExtraActionsButton'));
    expect(onClick).toHaveBeenCalled();
  });

  it('renders with correct icon when it is specified in the actionContext', () => {
    const { queryByTestId, container } = render(
      <ExtraActionsButton
        onClick={() => {}}
        showTooltip={false}
        extraActionsIconType="boxesVertical"
        extraActionsColor="text"
      />
    );

    expect(queryByTestId('showExtraActionsButton')).toBeInTheDocument();
    expect(container.querySelector('[data-euiicon-type="boxesVertical"]')).toBeInTheDocument();
  });
});
