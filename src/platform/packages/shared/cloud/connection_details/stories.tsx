/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { ConnectionDetailsOptsProvider } from './context';
import type { ConnectionDetailsOpts } from './types';

const defaultOpts: ConnectionDetailsOpts = {
  links: {
    learnMore: 'https://www.elastic.co/LEARN_MORE',
  },
  endpoints: {
    url: 'https://f67d6bf1a3cf40888e8863f6cb2cdc4c.us-east-1.aws.staging.foundit.no:443',
    id: 'my-cluster-id:dXMtZWFzdC0xLmF3cy5zdGFnaW5nLmZvdW5kaXQubm8kZjY3ZDZiZjFhM2NmNDA4ODhlODg2M2Y2Y2IyY2RjNGMkOWViYzEzYjRkOTU0NDI2NDljMzcwZTNlZjMyZWYzOGI=',
    cloudIdLearMoreLink: 'https://www.elastic.co/guide/en/cloud/current/ec-cloud-id.html',
  },
  apiKeys: {
    manageKeysLink: 'https://www.elastic.co/MANAGE_API_KEYS',
    createKey: async ({ name }) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return {
        apiKey: {
          id: 'hjfq4o4BTjxWQruxIear',
          name,
          encoded: 'aGpmcTRvNEJUanhXUXJ1eEllYXI6VUJYc1lPNkhSTy1PempUTk0tSjF6Zw==',
          key: 'UBXsYO6HRO-OzjTNM-J1zg',
        },
      };
    },
    hasPermission: async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return true;
    },
  },
};

export const StoriesProvider: React.FC<React.PropsWithChildren<Partial<ConnectionDetailsOpts>>> = ({
  children,
  ...rest
}) => {
  return (
    <ConnectionDetailsOptsProvider {...{ ...defaultOpts, ...rest }}>
      {children}
    </ConnectionDetailsOptsProvider>
  );
};

export const StoriesProviderKeyCreationError: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => {
  const opts: ConnectionDetailsOpts = {
    ...defaultOpts,
    apiKeys: {
      ...defaultOpts!.apiKeys!,
      createKey: async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        throw new Error('Failed to create API key');
      },
    },
  };

  return <ConnectionDetailsOptsProvider {...opts}>{children}</ConnectionDetailsOptsProvider>;
};

export const StoriesProviderNoKeyPermissions: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => {
  const opts: ConnectionDetailsOpts = {
    ...defaultOpts,
    apiKeys: {
      ...defaultOpts!.apiKeys!,
      hasPermission: async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        return false;
      },
    },
  };

  return <ConnectionDetailsOptsProvider {...opts}>{children}</ConnectionDetailsOptsProvider>;
};
