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
}

export enum TelemetryControlCancelledReason {
  CANCEL_BUTTON = 'cancel_button',
}
