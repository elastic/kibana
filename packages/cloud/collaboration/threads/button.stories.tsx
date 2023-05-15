/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { ArgTypes } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import { CordProvider } from '@cord-sdk/react';
import { BehaviorSubject } from 'rxjs';
import { ThreadButton as Component, Props as ThreadButtonProps } from './button';
import mdx from './README.mdx';
import { URLStorageState } from './flyout';

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
  const [threadId, setThreadId] = React.useState<string | null | undefined>(null);
  const [isComposing, setIsComposing] = React.useState(false);
  const change$ = new BehaviorSubject<URLStorageState>({ tid: threadId, ic: isComposing });

  const kbnStateStorage: ThreadButtonProps['kbnStateStorage'] = {
    get: () => ({ tid: threadId, ic: isComposing }),
    set: (id: string, { tid, ic }) => {
      setThreadId(tid);
      setIsComposing(ic);
      change$.next({ tid, ic });
      return new Promise((resolve) => resolve(id));
    },
    change$: () => change$,
    kbnUrlControls: {
      update: (url) => {
        action('update')(url);
        return url;
      },
    },
  };
  return (
    <CordProvider clientAuthToken={clientAuthToken}>
      <Component
        application="storybook"
        savedObjectId="abcde-12345"
        kbnStateStorage={kbnStateStorage}
        {...props}
      />
    </CordProvider>
  );
};

ThreadButton.argTypes = argTypes;
