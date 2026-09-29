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
import { render, screen } from '@testing-library/react';
import { BehaviorSubject, of } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { scopedHistoryMock } from '@kbn/core-application-browser-mocks';
import { ManagementApp } from './management_app';
import { ManagementSection } from '../../utils';
import type { SectionsServiceStart, NavigationCardsSubject } from '../../types';

vi.mock('@kbn/shared-ux-page-kibana-template', () => {
  const mocked = {
    KibanaPageTemplate: vi.fn(({ mainProps, children }) => (
      <div data-test-subj="page-template" data-main-padding={mainProps?.paddingSize}>
        {children}
      </div>
    )),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./management_router', () => {
  const mocked = {
    ManagementRouter: ({ onAppMounted }: { onAppMounted: (id: string) => void }) => {
      const { useEffect } = require('react') as typeof import('react');

      useEffect(() => {
        onAppMounted('cases');
      }, [onAppMounted]);

      return <div data-test-subj="management-router" />;
    },
  };
  return { ...mocked, default: mocked };
});

const renderManagementApp = (section: ManagementSection) => {
  const coreStart = coreMock.createStart();

  return render(
    <ManagementApp
      appBasePath="/app/management"
      history={scopedHistoryMock.create()}
      dependencies={{
        sections: {
          getSectionsEnabled: () => [section],
        } satisfies SectionsServiceStart,
        kibanaVersion: '9.0.0',
        coreStart,
        isAirGapped: false,
        setBreadcrumbs: vi.fn(),
        isSidebarEnabled$: new BehaviorSubject(false),
        cardsNavigationConfig$: new BehaviorSubject<NavigationCardsSubject>({ enabled: false }),
        chromeStyle$: of('classic'),
        getAutoOpsStatusHook: () => () => ({
          isCloudConnectAutoopsEnabled: false,
          isLoading: false,
        }),
      }}
    />
  );
};

describe('ManagementApp', () => {
  beforeAll(() => {
    window.scrollTo = vi.fn();
  });

  it('uses the mounted app mainPaddingSize when provided', async () => {
    const section = new ManagementSection({ id: 'insightsAndAlerting', title: 'Insights' });
    section.registerApp({
      id: 'cases',
      title: 'Cases',
      mount: () => () => {},
      mainPaddingSize: 'none',
    });

    renderManagementApp(section);

    expect(await screen.findByTestId('page-template')).toHaveAttribute('data-main-padding', 'none');
  });

  it('uses medium padding when mainPaddingSize is not set', async () => {
    const section = new ManagementSection({ id: 'insightsAndAlerting', title: 'Insights' });
    section.registerApp({
      id: 'cases',
      title: 'Cases',
      mount: () => () => {},
    });

    renderManagementApp(section);

    expect(await screen.findByTestId('page-template')).toHaveAttribute('data-main-padding', 'm');
  });
});
