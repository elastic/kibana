/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Dispatch } from 'react';

import {
  EmbeddedConsoleAction as EmbeddableConsoleAction,
  EmbeddedConsoleView,
} from '../types/embeddable_console';

export class EmbeddableConsoleInfo {
  private _dispatch: Dispatch<EmbeddableConsoleAction> | null = null;
  private _alternateView: EmbeddedConsoleView | undefined;

  public get alternateView(): EmbeddedConsoleView | undefined {
    return this._alternateView;
  }

  public setDispatch(d: Dispatch<EmbeddableConsoleAction> | null) {
    this._dispatch = d;
  }

  public isEmbeddedConsoleAvailable(): boolean {
    return this._dispatch !== null;
  }

  public openEmbeddedConsole(content?: string) {
    // Embedded Console is not rendered on the page, nothing to do
    if (!this._dispatch) return;

    this._dispatch({ type: 'open', payload: content ? { content } : undefined });
  }

  public registerAlternateView(view: EmbeddedConsoleView | null) {
    this._alternateView = view ?? undefined;
  }
}
