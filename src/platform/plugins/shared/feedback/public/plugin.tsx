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
import type { CoreStart, OverlayRef, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { FeedbackButton, FeedbackForm } from './src';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface FeedbackPluginSetup {}

export interface FeedbackPluginStartDependencies {
  licensing: LicensingPluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface FeedbackPluginStart {}

export class FeedbackPlugin implements Plugin<FeedbackPluginSetup, FeedbackPluginStart> {
  private feedbackFormRef?: OverlayRef | undefined;

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(): FeedbackPluginSetup {
    return {};
  }

  public start(
    core: CoreStart,
    { licensing }: FeedbackPluginStartDependencies
  ): FeedbackPluginStart {
    const handleShowFeedbackForm = () => {
      this.feedbackFormRef?.close();

      this.feedbackFormRef = core.overlays.openModal(
        toMountPoint(
          <FeedbackForm
            core={core}
            hideFeedbackForm={() => {
              this.feedbackFormRef?.close();
              this.feedbackFormRef = undefined;
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
          <FeedbackButton
            handleShowFeedbackForm={handleShowFeedbackForm}
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
    if (this.feedbackFormRef) {
      this.feedbackFormRef.close();
      this.feedbackFormRef = undefined;
    }
  }
}
