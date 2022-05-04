/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export enum AUTOCOMPLETE_EVENT_TYPE {
  CALL = 'autocomplete:call',
  REQUEST = 'autocomplete:req',
  RESULT = 'autocomplete:res',
  ERROR = 'autocomplete:err',
}

export interface AutocompleteUsageCollector {
  trackCall: () => Promise<void>;
  trackRequest: () => Promise<void>;
  trackResult: () => Promise<void>;
  trackError: () => Promise<void>;
}
