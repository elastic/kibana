/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { StoriesProvider } from '../../../../stories';
import { SuccessFormControlled } from './success_form_controlled';
import type { Format } from './format_select';

export default {
  title: 'Connection Details/Tabs/API Keys/Success Form (controlled)',
};

export const Default = () => {
  const [format, setFormat] = React.useState<Format>('encoded');

  return (
    <StoriesProvider>
      <SuccessFormControlled
        apiKey={{
          id: 'KEY_ID',
          name: 'KEY_NAME',
          encoded: 'ENCODED_KEY',
          key: 'THE_KEY',
        }}
        format={format}
        onFormatChange={setFormat}
      />
    </StoriesProvider>
  );
};
