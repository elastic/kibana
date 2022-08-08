/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useEffect, useMemo, useRef } from 'react';
import { filter, ReplaySubject } from 'rxjs';
import { ThemeContext } from '@emotion/react';
import { Meta } from '@storybook/react';
import { CoreTheme } from '@kbn/core-theme-browser';

import { ErrorEmbeddable } from '..';
import { setTheme } from '../services';

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
  compact?: boolean;
  message: string;
}

function ErrorEmbeddableWrapper({ compact, message }: ErrorEmbeddableWrapperProps) {
  const embeddable = useMemo(
    () => new ErrorEmbeddable(message, { id: `${Math.random()}` }, undefined, compact),
    [compact, message]
  );
  const root = useRef<HTMLDivElement>(null);
  const theme$ = useMemo(() => new ReplaySubject<CoreTheme>(1), []);
  const theme = useContext(ThemeContext) as CoreTheme;

  useEffect(() => setTheme({ theme$: theme$.pipe(filter(Boolean)) }), [theme$]);
  useEffect(() => theme$.next(theme), [theme$, theme]);
  useEffect(() => {
    if (!root.current) {
      return;
    }

    embeddable.render(root.current);

    return () => embeddable.destroy();
  }, [embeddable]);

  return <div ref={root} />;
}

export const Default = ErrorEmbeddableWrapper as Meta<ErrorEmbeddableWrapperProps>;

Default.args = {
  message: 'Something went wrong',
};

export const DefaultCompact = ((props: ErrorEmbeddableWrapperProps) => (
  <ErrorEmbeddableWrapper {...props} compact />
)) as Meta<ErrorEmbeddableWrapperProps>;

DefaultCompact.args = { ...Default.args };
