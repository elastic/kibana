/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { Render } from '@kbn/presentation-util-plugin/public/__stories__';
import { getErrorRenderer } from '../error_renderer';

storiesOf('renderers/error', module).add('default', () => {
  const thrownError = new Error('There was an error');
  const config = {
    error: thrownError,
  };
  return <Render renderer={getErrorRenderer()} config={config} />;
});
