/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo } from 'react';
import { Meta } from '@storybook/react';

import { ErrorEmbeddable } from '..';

export default {
  title: 'components/ErrorEmbeddable',
  argTypes: {
    message: {
      name: 'Message',
      control: { type: 'text' },
    },
  },
} as Meta;

interface ErrorEmbeddableWrapperProps {
  message: string;
}

function ErrorEmbeddableWrapper({ message }: ErrorEmbeddableWrapperProps) {
  const embeddable = useMemo(
    () => new ErrorEmbeddable(message, { id: `${Math.random()}` }, undefined),
    [message]
  );
  useEffect(() => () => embeddable.destroy(), [embeddable]);

  return embeddable.render();
}

export const Default = ErrorEmbeddableWrapper as Meta<ErrorEmbeddableWrapperProps>;

Default.args = {
  message: 'Something went wrong',
};
