/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiContextMenu } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { coreMock } from '@kbn/core/public/mocks';
import { ACTION } from '../../../types';
import type { UISession } from '../../../types';
import { createExtendActionDescriptor } from './extend_button';

describe('createExtendActionDescriptor', () => {
  it('renders the extend icon as inline svg markup', () => {
    const action = createExtendActionDescriptor(
      {
        getExtendByDuration: jest.fn(),
      } as any,
      {
        id: 'session-id',
        name: 'test search',
        expires: '2026-06-04T00:00:00.000Z',
        actions: [ACTION.EXTEND],
      } as UISession,
      coreMock.createStart()
    );

    const { container } = render(
      <EuiContextMenu
        initialPanelId={0}
        panels={[
          {
            id: 0,
            items: [{ key: 'extend', name: action.label, icon: action.iconType }],
          },
        ]}
      />
    );

    expect(screen.getByText('Extend')).toBeInTheDocument();
    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('path[fill="currentColor"]')).toBeInTheDocument();
  });
});
