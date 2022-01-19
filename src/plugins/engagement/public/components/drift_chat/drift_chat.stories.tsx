/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { DriftChat } from './drift_chat';

export default {
  title: 'Drift Chat',
  description: '',
  parameters: {},
};

export const Component = () => {
  return (
    <div>
      <DriftChat />
    </div>
  );
};
