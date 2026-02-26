/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import React, { useRef, useEffect } from 'react';
import type { MountPoint } from '@kbn/core-mount-utils-browser';

interface Props {
  extension?: MountPoint<HTMLDivElement>;
  display?: 'block' | 'inlineBlock';
  containerClassName?: string;
}

export const HeaderExtension = ({ extension, display, containerClassName }: Props) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !extension) return;
    const unrender = extension(ref.current);
    return () => {
      unrender?.();
    };
  }, [extension]);

  return (
    <div
      css={css`
        &:empty {
          // empty containers should be removed from the layout flow
          display: contents;
        }
      `}
      ref={ref}
      className={containerClassName}
      style={{ display: display === 'inlineBlock' ? 'inline-block' : undefined }}
    />
  );
};
