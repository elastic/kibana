/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { InspectButton } from './inspect_button';

export class InspectComponentPluginPublic implements Plugin {
  constructor(_initializerContext: PluginInitializerContext) {}

  public setup(_core: CoreSetup) {
    return {};
  }

  public start(core: CoreStart) {
    core.chrome.navControls.registerRight({
      order: 1002,
      mount: toMountPoint(<InspectButton core={core} />, core.rendering),
    });
    return {};
  }

  public stop() {}
}
