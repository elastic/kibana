/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { I18nProvider } from '@kbn/i18n-react';

import { CaseStatuses } from '../status/types';
import { Tooltip } from '../tooltip/tooltip';
import type { CaseTooltipProps } from '../tooltip/types';

const tooltipProps: CaseTooltipProps = {
  title: 'Unusual process identified',
  description: 'There was an unusual process while adding alerts to existing case.',
  createdAt: '2020-02-19T23:06:33.798Z',
  createdBy: {
    fullName: 'Elastic User',
    username: 'elastic',
  },
  totalComments: 10,
  status: CaseStatuses.open,
};

const sampleText = 'This is a test span element!!';
const TestSpan = () => (
  <a href="https://www.elastic.co/">
    <span data-test-subj="sample-span">{sampleText}</span>
  </a>
);

const longTitle = `Lorem Ipsum is simply dummy text of the printing and typesetting industry. 
  Lorem Ipsum has been the industry standard dummy text ever since the 1500s!! Lorem!!!`; // maximum length of case title is 160 characters

const longDescription = `Lorem Ipsum is simply dummy text of the printing and typesetting industry. 
  Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer 
  took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, 
  but also the leap into electronic typesetting, remaining essentially unchanged.`;

storiesOf('Tooltip', module)
  .add('default', () => (
    <I18nProvider>
      <Tooltip {...tooltipProps}>
        <TestSpan />
      </Tooltip>
    </I18nProvider>
  ))
  .add('loading state', () => (
    <I18nProvider>
      <Tooltip {...tooltipProps} loading={true}>
        <TestSpan />
      </Tooltip>
    </I18nProvider>
  ))
  .add('long title', () => (
    <I18nProvider>
      <Tooltip {...tooltipProps} title={longTitle}>
        <TestSpan />
      </Tooltip>
    </I18nProvider>
  ))
  .add('long description', () => (
    <I18nProvider>
      <Tooltip {...tooltipProps} description={longDescription}>
        <TestSpan />
      </Tooltip>
    </I18nProvider>
  ))
  .add('in-progress status', () => (
    <I18nProvider>
      <Tooltip {...tooltipProps} status={CaseStatuses['in-progress']}>
        <TestSpan />
      </Tooltip>
    </I18nProvider>
  ))
  .add('closed status', () => (
    <I18nProvider>
      <Tooltip {...tooltipProps} status={CaseStatuses.closed}>
        <TestSpan />
      </Tooltip>
    </I18nProvider>
  ))
  .add('no user info', () => (
    <I18nProvider>
      <Tooltip {...tooltipProps} createdBy={{}}>
        <TestSpan />
      </Tooltip>
    </I18nProvider>
  ))
  .add('full name as user', () => (
    <I18nProvider>
      <Tooltip {...tooltipProps} createdBy={{ fullName: 'Elastic User' }}>
        <TestSpan />
      </Tooltip>
    </I18nProvider>
  ));
