/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreEditor, Range, Token } from '../../types';

export interface ResultTerm {
  context?: AutoCompleteContext;
  insertValue?: string;
  name?: string;
  value?: string;
}

export interface AutoCompleteContext {
  autoCompleteSet?: null | ResultTerm[];
  endpoint?: null | {
    paramsAutocomplete: {
      getTopLevelComponents: (method?: string | null) => unknown;
    };
    bodyAutocompleteRootComponents: unknown;
    id?: string;
  };
  urlPath?: null | unknown;
  urlParamsTokenPath?: Array<Record<string, string>> | null;
  method?: string | null;
  token?: Token;
  activeScheme?: unknown;
  replacingToken?: boolean;
  rangeToReplace?: Range;
  autoCompleteType?: null | string;
  editor?: CoreEditor;
  createdWithToken?: Token | null;
  updatedForToken?: Token | null;
  addTemplate?: unknown;
  prefixToAdd?: string;
  suffixToAdd?: string;
  textBoxPosition?: { lineNumber: number; column: number };
  urlTokenPath?: string[];
  otherTokenValues?: string;
  requestStartRow?: number | null;
  bodyTokenPath?: string[] | null;
  endpointComponentResolver?: unknown;
  globalComponentResolver?: unknown;
  documentation?: string;
}
