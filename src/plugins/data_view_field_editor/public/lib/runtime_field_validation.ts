/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { ScriptError } from '../components/preview/types';
import { RuntimeFieldPainlessError, PainlessErrorCode } from '../types';

export const getErrorCodeFromErrorReason = (reason: string = ''): PainlessErrorCode => {
  if (reason.startsWith('Cannot cast from')) {
    return 'CAST_ERROR';
  }
  return 'UNKNOWN';
};

export const parseEsError = (scriptError: ScriptError): RuntimeFieldPainlessError => {
  let reason = scriptError.caused_by?.reason;
  const errorCode = getErrorCodeFromErrorReason(reason);

  if (errorCode === 'CAST_ERROR') {
    // Help the user as he might have forgot to change the runtime type
    reason = `${reason} ${i18n.translate(
      'indexPatternFieldEditor.editor.form.scriptEditor.castErrorMessage',
      {
        defaultMessage: 'Verify that you have correctly set the runtime field type.',
      }
    )}`;
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
    reason: reason ?? null,
    code: errorCode,
  };
};
