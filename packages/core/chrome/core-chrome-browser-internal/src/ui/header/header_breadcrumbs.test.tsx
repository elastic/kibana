/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Workflows } from '@kbn/core-chrome-browser/src';
import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { BehaviorSubject, of } from 'rxjs';
import { HeaderBreadcrumbs } from './header_breadcrumbs';

const workflows$ = new BehaviorSubject<Workflows>({});

describe('HeaderBreadcrumbs', () => {
  it('renders updates to the breadcrumbs$ observable', async () => {
    const breadcrumbs$ = new BehaviorSubject([{ text: 'First' }]);

    render(
      <HeaderBreadcrumbs
        breadcrumbs$={breadcrumbs$}
        workflows$={workflows$}
        onWorkflowChange={() => undefined}
      />
    );

    expect(await screen.findByLabelText('Breadcrumbs')).toHaveTextContent('First');

    act(() => breadcrumbs$.next([{ text: 'First' }, { text: 'Second' }]));

    expect(await screen.findByLabelText('Breadcrumbs')).toHaveTextContent('FirstSecond');

    act(() => breadcrumbs$.next([]));

    expect(await screen.findByLabelText('Breadcrumbs')).toHaveTextContent('Kibana');
  });

  it('forces the last breadcrumb inactivity', async () => {
    const breadcrumbs$ = of([
      { text: 'First' },
      { text: 'Last', href: '/something', onClick: jest.fn() },
    ]);

    render(
      <HeaderBreadcrumbs
        breadcrumbs$={breadcrumbs$}
        workflows$={workflows$}
        onWorkflowChange={() => undefined}
      />
    );

    const lastBreadcrumb = await screen.findByTitle('Last');

    expect(lastBreadcrumb).not.toHaveAttribute('href');
    expect(lastBreadcrumb.tagName).not.toBe('a');
  });
});
