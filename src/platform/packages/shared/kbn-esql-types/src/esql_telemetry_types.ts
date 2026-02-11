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
  onSuggestionsReady?: (
    computeStart: number,
    computeEnd: number,
    queryLength: number,
    queryLines: number
  ) => void;
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

export interface TelemetryLatencyProps {
  duration: number; // Latency in milliseconds.
  queryLength: number; // Query length in characters.
  queryLines: number; // Query length in lines.
  sessionId: string; // Editor mount session id.
  isInitialLoad?: boolean; // True for the first sampled event of each metric.
}
