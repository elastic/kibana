/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type WelcomeRenderTelemetryNotice = () => null | JSX.Element;

export interface WelcomeServiceSetup {
  /**
   * Register listeners to be called when the Welcome component is mounted.
   * It can be called multiple times to register multiple listeners.
   */
  registerOnRendered: (onRendered: () => void) => void;
  /**
   * Register a renderer of the telemetry notice to be shown below the Welcome page.
   */
  registerTelemetryNoticeRenderer: (renderTelemetryNotice: WelcomeRenderTelemetryNotice) => void;
}

export class WelcomeService {
  private readonly onRenderedHandlers: Array<() => void> = [];
  private renderTelemetryNoticeHandler?: WelcomeRenderTelemetryNotice;

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
