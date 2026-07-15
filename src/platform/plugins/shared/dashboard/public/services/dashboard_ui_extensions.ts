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
 * Registers the component rendered on the empty dashboard screen in edit mode.
 */
export const registerDashboardEmptyScreenComponent = (
  Component: DashboardEmptyScreenComponent,
  options: DashboardEmptyScreenComponentOptions = {}
): (() => void) => {
  registeredExtension = { Component, ...options };

  return () => {
    registeredExtension = undefined;
  };
};

export const getDashboardEmptyScreenExtension = (): DashboardEmptyScreenExtension | undefined =>
  registeredExtension;
