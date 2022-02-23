/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { HomeWelcomeRenderTelemetryNotice } from '../../application/components/welcome';

export interface WelcomeServiceSetup {
  registerOnRendered: (onRendered: () => void) => void;
  registerTelemetryNoticeRenderer: (
    renderTelemetryNotice: HomeWelcomeRenderTelemetryNotice
  ) => void;
}

export class WelcomeService {
  private readonly onRenderedHandlers: Array<() => void> = [];
  private renderTelemetryNoticeHandler?: HomeWelcomeRenderTelemetryNotice;

  public setup(): WelcomeServiceSetup {
    return {
      registerOnRendered: (onRendered) => {
        this.onRenderedHandlers.push(onRendered);
      },
      registerTelemetryNoticeRenderer: (renderTelemetryNotice) => {
        this.renderTelemetryNoticeHandler = renderTelemetryNotice;
      },
    };
  }

  public onRendered() {
    this.onRenderedHandlers.forEach((onRendered) => onRendered());
  }

  public renderTelemetryNotice() {
    if (this.renderTelemetryNoticeHandler) {
      return this.renderTelemetryNoticeHandler();
    } else {
      return null;
    }
  }
}
