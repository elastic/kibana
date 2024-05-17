/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializableRecord } from '@kbn/utility-types';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { ActionFactory, BaseActionFactoryContext } from '../../dynamic_actions';
import { Demo, dashboardFactory, urlFactory } from './test_data';

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

storiesOf('components/ActionWizard', module)
  .add('default', () => <Demo actionFactories={[dashboard, url]} />)
  .add('Only one factory is available', () => (
    // to make sure layout doesn't break
    <Demo actionFactories={[dashboard]} />
  ))
  .add('Long list of action factories', () => (
    // to make sure layout doesn't break
    <Demo actionFactories={[dashboard, url, dashboard, url, dashboard, url, dashboard, url]} />
  ));
