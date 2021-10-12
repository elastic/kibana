/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';

import { DataPublicPluginStart } from '../shared_imports';
import type { EsRuntimeField } from '../types';

export interface RuntimeFieldPainlessError {
  message: string;
  reason: string;
  position: {
    offset: number;
    start: number;
    end: number;
  } | null;
  scriptStack: string[];
}

type Error = Record<string, any>;

/**
 * We are only interested in "script_exception" error type
 */
const getScriptExceptionErrorOnShard = (error: Error): Error | null => {
  if (error.type === 'script_exception') {
    return error;
  }

  if (!error.caused_by) {
    return null;
  }

  // Recursively try to get a script exception error
  return getScriptExceptionErrorOnShard(error.caused_by);
};

/**
 * We get the first script exception error on any failing shard.
 * The UI can only display one error at the time so there is no need
 * to look any further.
 */
const getScriptExceptionError = (error: Error): Error | null => {
  if (error === undefined || !Array.isArray(error.failed_shards)) {
    return null;
  }

  let scriptExceptionError = null;
  for (const err of error.failed_shards) {
    scriptExceptionError = getScriptExceptionErrorOnShard(err.reason);

    if (scriptExceptionError !== null) {
      break;
    }
  }
  return scriptExceptionError;
};

export const parseEsError = (
  error?: Error,
  isScriptError = false
): RuntimeFieldPainlessError | null => {
  if (error === undefined) {
    return null;
  }

  const scriptError = isScriptError ? error : getScriptExceptionError(error.caused_by);

  if (scriptError === null) {
    return null;
  }

  return {
    message: i18n.translate(
      'indexPatternFieldEditor.editor.form.scriptEditor.compileErrorMessage',
      {
        defaultMessage: 'Error compiling the painless script',
      }
    ),
    position: scriptError.position ?? null,
    scriptStack: scriptError.script_stack ?? [],
    reason: scriptError.caused_by?.reason ?? null,
  };
};

/**
 * Handler to validate the painless script for syntax and semantic errors.
 * This is a temporary solution. In a future work we will have a dedicate
 * ES API to debug the script.
 */
export const getRuntimeFieldValidator =
  (index: string, searchService: DataPublicPluginStart['search']) =>
  async (runtimeField: EsRuntimeField) => {
    return await searchService
      .search({
        params: {
          index,
          body: {
            runtime_mappings: {
              temp: runtimeField,
            },
            size: 0,
            query: {
              match_none: {},
            },
          },
        },
      })
      .toPromise()
      .then(() => null)
      .catch((e) => {
        return parseEsError(e.attributes);
      });
  };
