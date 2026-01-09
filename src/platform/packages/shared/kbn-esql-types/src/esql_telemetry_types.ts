/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface ESQLTelemetryCallbacks {
  onDecorationHoverShown?: (hoverMessage: string) => void;
  onSuggestionsWithCustomCommandShown?: (commandNames: string[]) => void;
  onSuggestionsReady?: () => void; // Signal: suggestions data is ready.
}

export enum QuerySource {
  HISTORY = 'history',
  STARRED = 'starred',
  MANUAL = 'manual',
  HELP = 'help',
  AUTOCOMPLETE = 'autocomplete',
  QUICK_SEARCH = 'quick_search',
}

export interface TelemetryQuerySubmittedProps {
  source: QuerySource;
  query: string;
}

export enum ControlTriggerSource {
  SMART_SUGGESTION = 'smart_suggestion',
  QUESTION_MARK = 'question_mark',
  ADD_CONTROL_BTN = 'add_control_btn',
}

export enum TelemetryControlCancelledReason {
  CANCEL_BUTTON = 'cancel_button',
  CLOSE_BUTTON = 'close_button',
}

export interface TelemetryLatencyMeta {
  result: 'ok' | 'error';
}

export interface BaseLatencyPayload {
  duration: number;
  queryLengthBucket: number;
  queryLengthBucketLabel: string;
  sessionId: string; // Id to correlate events within an editor session.
  interactionId?: number; // Optional id to correlate events from the same interaction.
}

export type InputLatencyPayload = BaseLatencyPayload;

export type SuggestionsLatencyPayload = BaseLatencyPayload;

export interface ValidationLatencyPayload extends BaseLatencyPayload {
  errorCount: number; // Number of validation errors detected.
  meta: TelemetryLatencyMeta;
}
