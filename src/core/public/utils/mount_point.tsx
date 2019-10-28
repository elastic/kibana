/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';

/**
 * A function that will mount the banner inside the provided element.
 * @param element the container element to render into
 * @returns a {@link UnmountCallback} that unmount the element on call.
 *
 * @public
 */
export type MountPoint = (element: HTMLElement) => UnmountCallback;

/**
 * A function that will unmount the element previously mounted by
 * the associated {@link MountPoint}
 *
 * @public
 */
export type UnmountCallback = () => void;

/**
 * MountWrapper is a react component to mount a {@link MountPoint} inside a react tree.
 *
 * @internal
 */
export const MountWrapper: React.FunctionComponent<{ mount: MountPoint }> = ({ mount }) => {
  const element = useRef(null);
  useEffect(() => mount(element.current!), [mount]);
  return <div className="kbnMountWrapper" ref={element} />;
};

/**
 * Mount converter for react components.
 *
 * @param component to get a mount for
 *
 * @internal
 */
export const mountReact = (component: React.ReactNode): MountPoint => (element: HTMLElement) => {
  ReactDOM.render(<I18nProvider>{component}</I18nProvider>, element);
  return () => ReactDOM.unmountComponentAtNode(element);
};
