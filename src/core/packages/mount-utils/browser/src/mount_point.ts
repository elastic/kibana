/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';

/**
 * A function that should mount DOM content inside the provided container element
 * and return a handler to unmount it.
 *
 * @param element the container element to render into
 * @returns a {@link UnmountCallback} that unmount the element on call.
 *
 * @deprecated Use `ReactNode` instead. Chrome extension point APIs now accept `content: ReactNode` directly.
 * @public
 */
export type MountPoint<T extends HTMLElement = HTMLElement> = (element: T) => UnmountCallback;

/**
 * A function that will unmount the element previously mounted by
 * the associated {@link MountPoint}
 *
 * @public
 */
export type UnmountCallback = () => void;

/**
 * A union type representing either a React node (preferred) or a legacy {@link MountPoint}.
 * Used internally by chrome renderer components to handle both forms during migration.
 *
 * @internal
 */
export type ChromeExtensionContent<T extends HTMLElement = HTMLElement> = ReactNode | MountPoint<T>;

/**
 * Returns `true` if the given `ChromeExtensionContent` is a {@link MountPoint} (legacy imperative API).
 *
 * @internal
 */
export const isMountPoint = <T extends HTMLElement = HTMLElement>(
  content: ChromeExtensionContent<T>
): content is MountPoint<T> => typeof content === 'function';
