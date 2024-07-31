/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EditorError } from '../types';
import type { ESQLRealField } from '../validation/types';

type GetSourceFn = () => Promise<string[]>;
type GetFieldsByTypeFn = (type: string | string[], ignored?: string[]) => Promise<ESQLRealField[]>;
type GetPoliciesFn = () => Promise<string[]>;
type GetPolicyFieldsFn = (name: string) => Promise<string[]>;

export interface Callbacks {
  getSources: GetSourceFn;
  getFieldsByType: GetFieldsByTypeFn;
  getPolicies: GetPoliciesFn;
  getPolicyFields: GetPolicyFieldsFn;
}

export interface CodeAction {
  title: string;
  diagnostics: EditorError[];
  kind: 'quickfix';
  edits: Array<{
    range: EditorError;
    text: string;
  }>;
}

export interface CodeActionOptions {
  relaxOnMissingCallbacks?: boolean;
}
