/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type {
  UiSettingsParams,
  PublicUiSettingsParams,
  UserProvidedValues,
  UiSettingsType,
} from '../types';

/**
 * A function that should mount DOM content inside the provided container element
 * and return a handler to unmount it.
 *
 * @param element the container element to render into
 * @returns a {@link UnmountCallback} that unmount the element on call.
 *
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
