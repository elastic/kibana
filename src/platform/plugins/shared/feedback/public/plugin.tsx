/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart, Plugin } from '@kbn/core/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { FeedbackTriggerButton } from './src';

interface FeedbackPluginStartDependencies {
  licensing: LicensingPluginStart;
}

export class FeedbackPlugin implements Plugin {
  public setup() {
    return {};
  }

  public start(core: CoreStart, { licensing }: FeedbackPluginStartDependencies) {
    // TODO: Hide if hideFeedback global settings is disabled
    core.chrome.navControls.registerRight({
      order: 1000,
      mount: (element) => {
        ReactDOM.render(<FeedbackTriggerButton core={core} />, element);
        return () => {
          ReactDOM.unmountComponentAtNode(element);
        };
      },
    });

    return {};
  }

  public stop() {}
}
