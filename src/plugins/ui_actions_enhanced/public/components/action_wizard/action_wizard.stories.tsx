/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { SerializableRecord } from '@kbn/utility-types';
import { Demo, dashboardFactory, urlFactory } from './test_data';
import { ActionFactory, BaseActionFactoryContext } from '../../dynamic_actions';

const dashboard = dashboardFactory as unknown as ActionFactory<
  SerializableRecord,
  object,
  BaseActionFactoryContext
>;

const url = urlFactory as unknown as ActionFactory<
  SerializableRecord,
  object,
  BaseActionFactoryContext
>;

export default {
  title: 'components/ActionWizard',
};

export const Default = () => <Demo actionFactories={[dashboard, url]} />;

Default.story = {
  name: 'default',
};

export const OnlyOneFactoryIsAvailable = () => (
  // to make sure layout doesn't break
  <Demo actionFactories={[dashboard]} />
);

OnlyOneFactoryIsAvailable.story = {
  name: 'Only one factory is available',
};

export const LongListOfActionFactories = () => (
  // to make sure layout doesn't break
  <Demo actionFactories={[dashboard, url, dashboard, url, dashboard, url, dashboard, url]} />
);

LongListOfActionFactories.story = {
  name: 'Long list of action factories',
};
