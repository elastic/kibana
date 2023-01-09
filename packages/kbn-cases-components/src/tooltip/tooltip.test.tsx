/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { Tooltip } from './tooltip';
import { CaseStatuses } from '../status/types';

const elasticUser = {
  fullName: 'Elastic User',
  username: 'elastic',
};

const sampleText = 'This is a testing span!!';
const TestSpan = () => <span data-test-subj="sample-span">{sampleText}</span>;

const tooltipProps = {
  title: 'Another horrible breach!!',
  description: 'Demo case banana Issue',
  createdAt: '2020-02-19T23:06:33.798Z',
  createdBy: elasticUser,
  totalComments: 1,
  status: CaseStatuses.open,
};

describe('Tooltip', () => {
  it('renders correctly', async () => {
    const res = render(
      <I18nProvider>
        <Tooltip {...tooltipProps}>
          <TestSpan />
        </Tooltip>
      </I18nProvider>
    );

    fireEvent.mouseOver(res.getByTestId('sample-span'));
    expect(await res.findByTestId('cases-components-tooltip')).toBeInTheDocument();
  });

  it('renders custom test subject correctly', async () => {
    const res = render(
      <I18nProvider>
        <Tooltip {...tooltipProps} dataTestSubj="custom-data-test">
          <TestSpan />
        </Tooltip>
      </I18nProvider>
    );

    fireEvent.mouseOver(res.getByTestId('sample-span'));
    expect(await res.findByTestId('custom-data-test')).toBeInTheDocument();
  });

  it('renders icon', async () => {
    const res = render(
      <I18nProvider>
        <Tooltip {...tooltipProps}>
          <TestSpan />
        </Tooltip>
      </I18nProvider>
    );

    fireEvent.mouseOver(res.getByTestId('sample-span'));
    expect(await res.findByTestId('comment-count-icon')).toBeInTheDocument();
  });

  it('renders correct status', async () => {
    const res = render(
      <I18nProvider>
        <Tooltip {...tooltipProps} status={CaseStatuses.closed}>
          <TestSpan />
        </Tooltip>
      </I18nProvider>
    );

    fireEvent.mouseOver(res.getByTestId('sample-span'));
    expect(await res.findByText('Closed')).toBeInTheDocument();
  });

  it('renders full name when no username available', async () => {
    const newUser = {
      fullName: 'New User',
    };

    const res = render(
      <I18nProvider>
        <Tooltip {...tooltipProps} createdBy={newUser}>
          <TestSpan />
        </Tooltip>
      </I18nProvider>
    );

    fireEvent.mouseOver(res.getByTestId('sample-span'));
    expect(await res.findByText(newUser.fullName)).toBeInTheDocument();
  });

  it('renders full name when username or full name not available', async () => {
    const res = render(
      <I18nProvider>
        <Tooltip {...tooltipProps} createdBy={{}}>
          <TestSpan />
        </Tooltip>
      </I18nProvider>
    );

    fireEvent.mouseOver(res.getByTestId('sample-span'));
    expect(await res.findByTestId('tooltip-username')).toHaveTextContent('');
  });
});
