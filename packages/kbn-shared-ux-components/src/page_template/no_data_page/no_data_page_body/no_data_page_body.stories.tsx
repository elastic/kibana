/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactElement } from 'react';
import { action } from '@storybook/addon-actions';
import { servicesFactory } from '@kbn/shared-ux-storybook';
import { NoDataPageBody, NoDataPageBodyProps } from './no_data_page_body';
import { NoDataCard } from '../no_data_card';

const services = servicesFactory({});
const cardAction = {
  recommended: false,
  button: 'Button text',
  onClick: action('Clicked'),
};
const card1 = <NoDataCard key={'key1'} title={'Add data'} {...cardAction} />;
const card2 = <NoDataCard key={'key2'} title={'Add data'} {...cardAction} />;
const actionCards: ReactElement[] = [
  <div key={'action1'}>{card1}</div>,
  <div key={'action2'}>{card2}</div>,
];

export default {
  title: 'Page Template/No Data Page/No Data Page Body',
  description: 'A body of NoDataPage',
};

type Params = Pick<NoDataPageBodyProps, 'solution'>;

export const PureComponent = (params: Params) => {
  return (
    <NoDataPageBody
      docsLink={services.docLinks.dataViewsDocLink}
      actionCards={actionCards}
      {...params}
    />
  );
};

PureComponent.argTypes = {
  solution: {
    control: 'text',
    defaultValue: 'Observability',
  },
};
