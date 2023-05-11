/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { ArgTypes } from '@storybook/react';

import { CordProvider } from '@cord-sdk/react';
import { ThreadButton as Component } from './button';
import mdx from './README.mdx';

export default {
  title: 'Threads/Thread Button',
  description: '',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

const argTypes: ArgTypes<Params> = {
  clientAuthToken: {
    name: 'clientAuthToken',
    type: { name: 'string', required: true },
    defaultValue: '',
  },
  savedObjectName: {
    name: 'savedObjectName',
    type: { name: 'string', required: true },
    defaultValue: 'Thread Button Storybook',
  },
};

interface Params {
  clientAuthToken: string;
  savedObjectName?: string;
}

export const ThreadButton = ({ clientAuthToken, ...props }: Params) => {
  return (
    <CordProvider clientAuthToken={clientAuthToken}>
      <Component application="storybook" savedObjectId="abcde-12345" {...props} />
    </CordProvider>
  );
};

ThreadButton.argTypes = argTypes;
