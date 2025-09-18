/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { AnalyticsServiceStart } from '@kbn/core/server';
import {
  INDEX_EDITOR_FLYOUT_OPENED_EVENT_TYPE,
  INDEX_EDITOR_SAVE_SUBMITTED_EVENT_TYPE,
} from './events_registration';
import { getBucket } from './utils';

type FlyoutMode = 'create' | 'view' | 'edit';
export class IndexEditorTelemetryService {
  private _analytics: AnalyticsServiceStart;
  private _flyoutMode: FlyoutMode;
  private _invocationSource: string;

  constructor(
    analytics: AnalyticsServiceStart,
    canEditIndex: boolean,
    doesIndexExists: boolean,
    invocationSource: string
  ) {
    this._analytics = analytics;
    this._flyoutMode = this.getFlyoutMode(canEditIndex, doesIndexExists);
    this._invocationSource = invocationSource;
  }

  private reportEvent(eventType: string, eventData: Record<string, unknown>) {
    try {
      this._analytics.reportEvent(eventType, eventData);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('Failed to report telemetry event', error);
    }
  }

  public trackFlyoutOpened(eventData: { docCount: number; fieldCount: number }) {
    this.reportEvent(INDEX_EDITOR_FLYOUT_OPENED_EVENT_TYPE, {
      flyout_mode: this._flyoutMode,
      invocation_source: this._invocationSource,
      doc_count_bucket: getBucket(eventData.docCount, [
        { label: '1-100', to: 100 },
        { label: '101-10k', to: 10000 },
      ]),
      field_count_bucket: getBucket(eventData.fieldCount, [
        { label: '1-4', to: 4 },
        { label: '5-20', to: 20 },
      ]),
    });
  }

  public trackSaveSubmitted(eventData: {
    pendingRowsAdded: number;
    pendingColsAdded: number;
    pendingCellsEdited: number;
    action: 'save' | 'save_and_exit';
    outcome: 'success' | 'error';
    latency: number;
  }) {
    this.reportEvent(INDEX_EDITOR_SAVE_SUBMITTED_EVENT_TYPE, {
      flyout_mode: this._flyoutMode,
      pending_rows_added: eventData.pendingRowsAdded,
      pending_cols_added: eventData.pendingColsAdded,
      pending_cells_edited: eventData.pendingCellsEdited,
      action: eventData.action,
      outcome: eventData.outcome,
      exec_latency_bucket: getBucket(eventData.latency, [
        { label: '0-1s', to: 1000 },
        { label: '1s-3s', to: 3000 },
        { label: '3s-5s', to: 5000 },
      ]),
    });
  }

  private getFlyoutMode(canEditIndex: boolean, doesIndexExists: boolean): FlyoutMode {
    if (!doesIndexExists) {
      return 'create';
    }
    return canEditIndex ? 'edit' : 'view';
  }
}
