/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import type { AgentMark } from './agent_marker';
import { AgentMarker } from './agent_marker';

function renderWithTheme(component: React.ReactNode, params?: any) {
  return render(<EuiThemeProvider>{component}</EuiThemeProvider>, params);
}

describe('AgentMarker', () => {
  it('renders correctly', () => {
    const mark: AgentMark = {
      id: 'agent',
      offset: 1000,
      type: 'agentMark',
      verticalLine: true,
    };

    const { container } = renderWithTheme(<AgentMarker mark={mark} />);

    expect(container).toMatchSnapshot();
  });
});
