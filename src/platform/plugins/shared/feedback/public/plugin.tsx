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
import type { CoreStart, OverlayRef, Plugin } from '@kbn/core/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { FeedbackTriggerButton, FeedbackContainer } from './src';

interface FeedbackPluginStartDependencies {
  licensing: LicensingPluginStart;
}

export class FeedbackPlugin implements Plugin {
  private feedbackContainer?: OverlayRef;

  constructor() {}

  public setup() {
    return {};
  }

  public start(core: CoreStart, { licensing }: FeedbackPluginStartDependencies) {
    const handleShowFeedbackContainer = () => {
      this.feedbackContainer?.close();

      this.feedbackContainer = core.overlays.openModal(
        toMountPoint(
          <FeedbackContainer
            core={core}
            hideFeedbackContainer={() => {
              this.feedbackContainer?.close();
              this.feedbackContainer = undefined;
            }}
          />,
          core.rendering
        )
      );
    };

    core.chrome.navControls.registerRight({
      order: 1000,
      mount: (element) => {
        ReactDOM.render(
          <FeedbackTriggerButton
            handleShowFeedbackContainer={handleShowFeedbackContainer}
            analytics={core.analytics}
          />,
          element
        );

        return () => {
          ReactDOM.unmountComponentAtNode(element);
        };
      },
    });

    return {};
  }

  public stop() {
    if (this.feedbackContainer) {
      this.feedbackContainer.close();
      this.feedbackContainer = undefined;
    }
  }
}
