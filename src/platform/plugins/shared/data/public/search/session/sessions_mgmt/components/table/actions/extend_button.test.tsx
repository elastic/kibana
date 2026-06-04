/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiIcon } from '@elastic/eui';
import { screen } from '@testing-library/react';
import React from 'react';
import { coreMock } from '@kbn/core/public/mocks';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { ACTION } from '../../../types';
import type { UISession } from '../../../types';
import { ExtendSessionSvg } from './icons/extend_session.svg';
import { createExtendActionDescriptor } from './extend_button';

const isEuiIconElement = (
  icon: unknown
): icon is React.ReactElement<React.ComponentProps<typeof EuiIcon>, typeof EuiIcon> =>
  React.isValidElement(icon) && icon.type === EuiIcon;

jest.mock('./icons/extend_session.svg', () => ({
  ExtendSessionSvg: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" {...props}>
      <path fill="currentColor" d="M0 0h16v16H0z" />
    </svg>
  ),
}));

describe('createExtendActionDescriptor', () => {
  it('renders the extend icon through EuiIcon as inline svg markup', () => {
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

    if (!isEuiIconElement(action.icon)) {
      throw new Error('Expected extend action icon to be a React element');
    }

    expect(action.icon.type).toBe(EuiIcon);
    expect(action.icon.props.type).toBe(ExtendSessionSvg);
    expect(action.icon.props.size).toBe('m');
    expect(action.icon.props.color).toBe('inherit');
    expect(action.icon.props['aria-hidden']).toBe(true);
    renderWithI18n(action.label);
    expect(screen.getByText('Extend')).toBeInTheDocument();
  });
});
