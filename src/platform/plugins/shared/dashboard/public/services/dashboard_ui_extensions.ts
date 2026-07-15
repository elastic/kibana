/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentType } from 'react';

export type DashboardEmptyScreenComponent = ComponentType;

export interface DashboardEmptyScreenComponentOptions {
  hideFeaturedActionIds?: readonly string[];
}

interface DashboardEmptyScreenExtension extends DashboardEmptyScreenComponentOptions {
  Component: DashboardEmptyScreenComponent;
}

let registeredExtension: DashboardEmptyScreenExtension | undefined;

/**
 * Registers a component to render on the empty dashboard screen in edit mode.
 *
 * This is a single-slot registry: registering a second component replaces the
 * first one. The registry is read once per render and is not reactive, so
 * registration must happen during plugin `start`, before any dashboard is
 * rendered.
 *
 * @returns a cleanup function that unregisters the component.
 */
export const registerDashboardEmptyScreenComponent = (
  Component: DashboardEmptyScreenComponent,
  options: DashboardEmptyScreenComponentOptions = {}
): (() => void) => {
  if (registeredExtension !== undefined) {
    // eslint-disable-next-line no-console
    console.warn(
      'registerDashboardEmptyScreenComponent: a dashboard empty screen component is already registered and will be replaced.'
    );
  }

  const extension = { Component, ...options };
  registeredExtension = extension;

  return () => {
    if (registeredExtension === extension) {
      registeredExtension = undefined;
    }
  };
};

export const getDashboardEmptyScreenExtension = (): DashboardEmptyScreenExtension | undefined =>
  registeredExtension;
