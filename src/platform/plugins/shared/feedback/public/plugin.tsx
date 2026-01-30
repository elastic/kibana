/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { filter, firstValueFrom } from 'rxjs';
import { FeedbackButton, FeedbackForm } from './src';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface FeedbackPluginSetup {}

export interface FeedbackPluginStartDependencies {
  licensing: LicensingPluginStart;
}

interface FeedbackPluginStart {
  registeredItems: string[];
}

export class FeedbackPlugin implements Plugin<FeedbackPluginSetup, FeedbackPluginStart> {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(): FeedbackPluginSetup {
    return {};
  }

  public start(
    core: CoreStart,
    { licensing }: FeedbackPluginStartDependencies
  ): FeedbackPluginStart {
    const handleShowFeedbackForm = () => {
      const feedbackFormRef = core.overlays.openModal(
        toMountPoint(
          <FeedbackForm
            core={core}
            hideFeedbackForm={() => {
              feedbackFormRef?.close();
            }}
          />,
          core.rendering
        )
      );
    };

    firstValueFrom(
      core.analytics.telemetryCounter$.pipe(filter((counter) => counter.type === 'succeeded'))
    ).then((isNotAdblocked) => {
      if (isNotAdblocked) {
        core.chrome.navControls.registerRight({
          order: 1002,
          mount: toMountPoint(
            <FeedbackButton handleShowFeedbackForm={handleShowFeedbackForm} />,
            core.rendering
          ),
        });
      }
    });

    // TODO: Return a way to register additional feedback options
    return {
      registeredItems: ['securitySolutionQuestion1', 'securitySolutionQuestion2'],
    };
  }

  public stop() {}
}
