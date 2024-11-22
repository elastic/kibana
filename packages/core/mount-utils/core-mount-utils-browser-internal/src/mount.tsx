/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nProvider } from '@kbn/i18n-react';
import type { MountPoint } from '@kbn/core-mount-utils-browser';

import './mount_wrapper.scss';

const defaultWrapperClass = 'kbnMountWrapper';

interface MountWrapperComponentProps {
  mount: MountPoint;
  className?: string;
}

/**
 * MountWrapper is a react component to mount a {@link MountPoint} inside a react tree.
 * @internal
 */
type MountWrapperComponent = React.FunctionComponent<MountWrapperComponentProps>;

/**
 * MountWrapper is a react component to mount a {@link MountPoint} inside a react tree.
 * @internal
 */
export const MountWrapper: MountWrapperComponent = ({ mount, className = defaultWrapperClass }) => {
  const element = useRef(null);
  useEffect(() => mount(element.current!), [mount]);
  return <div className={className} ref={element} />;
};

/**
 * Mount converter for react node.
 *
 * @param node to get a mount for
 * @internal
 */
export const mountReactNode =
  (node: React.ReactNode): MountPoint =>
  (element: HTMLElement) => {
    render(<I18nProvider>{node}</I18nProvider>, element);
    return () => unmountComponentAtNode(element);
  };
