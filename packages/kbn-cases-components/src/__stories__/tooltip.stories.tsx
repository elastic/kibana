/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { ComponentStory, ComponentMeta } from '@storybook/react';

import { CaseStatuses } from '../status/types';
import { Tooltip } from '../tooltip/tooltip';
import type { CaseTooltipProps, CaseTooltipContentProps } from '../tooltip/types';

const tooltipContent: CaseTooltipContentProps = {
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

const tooltipProps: CaseTooltipProps = {
  loading: false,
  content: tooltipContent,
};

const sampleText = 'This is a test span element!!';
const TestSpan = () => (
  <a href="https://www.elastic.co/">
    <span data-test-subj="sample-span">{sampleText}</span>
  </a>
);

const longTitle = `Lorem Ipsum is simply dummy text of the printing and typesetting industry. 
  Lorem Ipsum has been the industry standard dummy text ever since the 1500s!! Lorem!!!`;

const longDescription = `Lorem Ipsum is simply dummy text of the printing and typesetting industry. 
  Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer 
  took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, 
  but also the leap into electronic typesetting, remaining essentially unchanged.`;

const Template = (args: CaseTooltipProps) => (
  <I18nProvider>
    <Tooltip {...args}>
      <TestSpan />
    </Tooltip>
  </I18nProvider>
);

export default {
  title: 'CaseTooltip',
  component: Template,
} as ComponentMeta<typeof Template>;

export const Default: ComponentStory<typeof Template> = Template.bind({});
Default.args = { ...tooltipProps };

export const LoadingState: ComponentStory<typeof Template> = Template.bind({});
LoadingState.args = {...tooltipProps, loading: true}


export const LongTitle: ComponentStory<typeof Template> = Template.bind({});
LongTitle.args = {...tooltipProps, content:{ ...tooltipContent, title:longTitle }}

export const LongDescription: ComponentStory<typeof Template> = Template.bind({});
LongDescription.args = {...tooltipProps, content:{ ...tooltipContent, description:longDescription }}

export const InProgressStatus: ComponentStory<typeof Template> = Template.bind({});
InProgressStatus.args = {...tooltipProps, content:{ ...tooltipContent, status:CaseStatuses['in-progress'] }}

export const ClosedStatus: ComponentStory<typeof Template> = Template.bind({});
ClosedStatus.args = {...tooltipProps, content:{ ...tooltipContent, status:CaseStatuses.closed }}

export const NoUserInfo: ComponentStory<typeof Template> = Template.bind({});
NoUserInfo.args = {...tooltipProps, content:{ ...tooltipContent, createdBy:{} }}

export const FullName: ComponentStory<typeof Template> = Template.bind({});
FullName.args = {...tooltipProps, content:{ ...tooltipContent, createdBy:{ fullName: 'Elastic User' } }}

export const LongUserName: ComponentStory<typeof Template> = Template.bind({});
LongUserName.args = {...tooltipProps, content:{ ...tooltipContent, createdBy:{ fullName: 'LoremIpsumElasticUser WithALongSurname' } }}

