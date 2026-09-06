/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Browser surface: the Kibana mount adapter. `KibanaAdaptiveView` takes
// `surface: 'react' | 'html'` — `'react'` mounts through `EuiThemeProvider` in
// the light DOM, `'html'` injects CSS-inlined markup into a shadow root.
// Everything here reaches EUI, which is why it is not on the root entry.

export {
  adaptKibanaViewSpec,
  createKibanaActionHandler,
  createKibanaAdapterServices,
  createKibanaEventHandler,
  KIBANA_NAVIGATE_EVENT,
  KibanaAdaptiveView,
  mountKibanaHtmlView,
} from './vendor/adaptive-ui-host-kibana/react';

export type {
  AdaptKibanaViewOptions,
  KibanaActionEvent,
  KibanaAdaptiveViewProps,
  KibanaAdapterServices,
  KibanaCapabilities,
  KibanaColorMode,
  KibanaCoreStartLike,
  KibanaEventHandlers,
  KibanaThemeObservable,
  KibanaThemeSubscription,
  KibanaThemeValue,
  MountKibanaHtmlViewOptions,
} from './vendor/adaptive-ui-host-kibana/react';
