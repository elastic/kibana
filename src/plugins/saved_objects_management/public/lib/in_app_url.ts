/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Capabilities } from 'src/core/public';

export function canViewInApp(uiCapabilities: Capabilities, type: string): boolean {
  switch (type) {
    case 'search':
    case 'searches':
      return uiCapabilities.discover.show as boolean;
    case 'visualization':
    case 'visualizations':
      return uiCapabilities.visualize.show as boolean;
    case 'index-pattern':
    case 'index-patterns':
    case 'indexPatterns':
      return uiCapabilities.management.kibana.indexPatterns as boolean;
    case 'dashboard':
    case 'dashboards':
      return uiCapabilities.dashboard.show as boolean;
    default:
      return uiCapabilities[type].show as boolean;
  }
}
