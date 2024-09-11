/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { Annotations } from './annotations';

export default {
  title: '<Annotations>',
  parameters: {},
};

export const Default = () => (
  <Annotations
    value={'FROM index | LIMIT 10'}
    annotations={[
      [4, (text) => <span style={{ color: 'red' }}>{text}</span>],
      1,
      [5, (text) => <span style={{ color: 'blue' }}>{text}</span>],
      3,
      [5, (text) => <span style={{ color: 'red' }}>{text}</span>],
      1,
      [2, (text) => <span style={{ color: 'green' }}>{text}</span>],
    ]}
  />
);
