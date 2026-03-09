/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import React, { useRef, useEffect, Suspense, type CSSProperties } from 'react';
import { isMountPoint, type ChromeExtensionContent } from '@kbn/core-mount-utils-browser';

interface Props {
  extension?: ChromeExtensionContent<HTMLDivElement>;
  display?: 'block' | 'inlineBlock';
  containerClassName?: string;
}

interface MountPointBridgeProps {
  extension: (element: HTMLDivElement) => () => void;
  style?: CSSProperties;
  containerClassName?: string;
}

const mountPointContainerCss = css`
  &:empty {
    // empty containers should be removed from the layout flow
    display: contents;
  }
`;

const MountPointBridge = ({ extension, style, containerClassName }: MountPointBridgeProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const unrender = extension(ref.current);
    return () => {
      unrender?.();
    };
  }, [extension]);

  return (
    <div css={mountPointContainerCss} ref={ref} className={containerClassName} style={style} />
  );
};

export const HeaderExtension = ({ extension, display, containerClassName }: Props) => {
  if (!extension) return null;

  const style: CSSProperties | undefined =
    display === 'inlineBlock' ? { display: 'inline-block' } : undefined;

  if (!isMountPoint(extension)) {
    return (
      <Suspense fallback={null}>
        <div className={containerClassName} style={style}>
          {extension}
        </div>
      </Suspense>
    );
  }

  return (
    <MountPointBridge extension={extension} containerClassName={containerClassName} style={style} />
  );
};
