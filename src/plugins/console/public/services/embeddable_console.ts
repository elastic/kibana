/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Dispatch } from 'react';
import { debounce } from 'lodash';

import {
  EmbeddedConsoleAction as EmbeddableConsoleAction,
  EmbeddedConsoleView,
} from '../types/embeddable_console';
import { Storage } from '.';

const CONSOLE_HEIGHT_KEY = 'embeddedConsoleHeight';
const CONSOLE_HEIGHT_LOCAL_STORAGE_DEBOUNCE_WAIT_TIME = 500;

export class EmbeddableConsoleInfo {
  private _dispatch: Dispatch<EmbeddableConsoleAction> | null = null;
  private _alternateView: EmbeddedConsoleView | undefined;

  constructor(private readonly storage: Storage) {
    this.setConsoleHeight = debounce(
      this.setConsoleHeight.bind(this),
      CONSOLE_HEIGHT_LOCAL_STORAGE_DEBOUNCE_WAIT_TIME
    );
  }

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

  public openEmbeddedConsoleAlternateView() {
    // Embedded Console is not rendered on the page, nothing to do
    if (!this._dispatch) return;

    this._dispatch({
      type: 'open',
      payload: { alternateView: this._alternateView !== undefined },
    });
  }

  public registerAlternateView(view: EmbeddedConsoleView | null) {
    this._alternateView = view ?? undefined;
  }

  public getConsoleHeight(): string | undefined {
    return this.storage.get(CONSOLE_HEIGHT_KEY, undefined);
  }

  public setConsoleHeight(value: string) {
    this.storage.set(CONSOLE_HEIGHT_KEY, value);
  }
}
