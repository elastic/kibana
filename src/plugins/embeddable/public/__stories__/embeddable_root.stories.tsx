/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { DecoratorFn, Meta } from '@storybook/react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { EmbeddableInput, EmbeddableRoot } from '..';
import { HelloWorldEmbeddable } from './hello_world_embeddable';

const layout: DecoratorFn = (story) => {
  return (
    <EuiFlexGroup direction="row" justifyContent="center">
      <EuiFlexItem grow={false} style={{ height: 300, width: 500 }}>
        {story()}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export default {
  title: 'components/EmbeddableRoot',
  argTypes: {
    loading: {
      name: 'Loading',
      control: { type: 'boolean' },
    },
    title: {
      name: 'Title',
      control: { type: 'text' },
    },
  },
  decorators: [layout],
} as Meta;

interface DefaultProps {
  error?: string;
  loading?: boolean;
  title: string;
}

export function Default({ title, ...props }: DefaultProps) {
  const id = useMemo(() => `${Math.random()}`, []);
  const input = useMemo<EmbeddableInput>(
    () => ({
      id,
      title,
      lastReloadRequestTime: new Date().getMilliseconds(),
    }),
    [id, title]
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const embeddable = useMemo(() => new HelloWorldEmbeddable(input, {}), []);

  return <EmbeddableRoot {...props} embeddable={embeddable} input={input} />;
}

Default.args = {
  title: 'Hello World',
  loading: false,
};

export const DefaultWithError = Default.bind({}) as Meta<DefaultProps>;

DefaultWithError.args = {
  ...Default.args,
  error: 'Something went wrong',
};

DefaultWithError.argTypes = {
  error: { name: 'Error', control: { type: 'text' } },
};
