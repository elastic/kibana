/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import React from 'react';
import { OverviewPageFooter } from './overview_page_footer';
import { shallowWithIntl } from '@kbn/test-jest-helpers';

vi.mock('@kbn/shared-ux-link-redirect-app', () => {
      const mocked = {
      RedirectAppLinks: vi.fn((element: JSX.Element) => element),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../context', () => {
      const mocked = {
      useKibana: vi.fn().mockReturnValue({
        services: {
          application: { capabilities: { advancedSettings: { show: true, save: true } } },
          notifications: { toast: { addSuccess: vi.fn() } },
        },
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../ui_settings', () => {
      const mocked = {
      useUiSetting$: vi.fn().mockReturnValue(['path-to-default-route', vi.fn()]),
    };
      return { ...mocked, default: mocked };
    });

afterEach(() => vi.clearAllMocks());

const addBasePathMock = vi.fn((path: string) => (path ? path : 'path'));

describe('OverviewPageFooter', () => {
  test('render', () => {
    const component = shallowWithIntl(
      <OverviewPageFooter addBasePath={addBasePathMock} path="new-default-route" />
    );
    expect(component).toMatchSnapshot();
  });
});
