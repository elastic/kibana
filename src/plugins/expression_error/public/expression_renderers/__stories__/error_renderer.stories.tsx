/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { coreMock } from '@kbn/core/public/mocks';
import { Render } from '@kbn/presentation-util-plugin/public/__stories__';
import { getErrorRenderer } from '../error_renderer';

storiesOf('renderers/error', module).add('default', () => {
  const thrownError = new Error('There was an error');
  const config = {
    error: thrownError,
  };

  return (
    <Render renderer={getErrorRenderer(coreMock.createStart().theme.theme$)} config={config} />
  );
});
