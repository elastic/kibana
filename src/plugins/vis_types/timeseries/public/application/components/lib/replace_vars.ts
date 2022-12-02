/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { encode } from '@kbn/rison';
import Handlebars, { ExtendedCompileOptions, compileFnName } from '@kbn/handlebars';
import { i18n } from '@kbn/i18n';
import { emptyLabel } from '../../../../common/empty_label';

const handlebars = Handlebars.create();

function createSerializationHelper(
  fnName: string,
  serializeFn: (value: unknown) => string
): Handlebars.HelperDelegate {
  return (...args) => {
    const { hash } = args.slice(-1)[0] as Handlebars.HelperOptions;
    const hasHash = Object.keys(hash).length > 0;
    const hasValues = args.length > 1;
    if (hasHash && hasValues) {
      throw new Error(`[${fnName}]: both value list and hash are not supported`);
    }
    if (hasHash) {
      if (Object.values(hash).some((v) => typeof v === 'undefined'))
        throw new Error(`[${fnName}]: unknown variable`);
      return serializeFn(hash);
    } else {
      const values = args.slice(0, -1) as unknown[];
      if (values.some((value) => typeof value === 'undefined'))
        throw new Error(`[${fnName}]: unknown variable`);
      if (values.length === 0) throw new Error(`[${fnName}]: unknown variable`);
      if (values.length === 1) return serializeFn(values[0]);
      return serializeFn(values);
    }
  };
}

handlebars.registerHelper(
  'rison',
  createSerializationHelper('rison', (v) => encode(v))
);

handlebars.registerHelper('encodeURIComponent', (component: unknown) => {
  const str = String(component);
  return encodeURIComponent(str);
});

export function replaceVars(
  str: string,
  args: Record<string, unknown> = {},
  vars: Record<string, unknown> = {},
  compileOptions: Partial<ExtendedCompileOptions> = {}
) {
  try {
    /** we need add '[]' for emptyLabel because this value contains special characters.
     * @see (https://handlebarsjs.com/guide/expressions.html#literal-segments) **/
    const template = handlebars[compileFnName](str.split(emptyLabel).join(`[${emptyLabel}]`), {
      strict: true,
      knownHelpersOnly: true,
      knownHelpers: {
        rison: true,
        encodeURIComponent: true,
      },
      ...compileOptions,
    });
    const string = template({
      ...vars,
      args,
    });

    return string;
  } catch (e) {
    // user is probably typing and so its not formed correctly
    if (e.toString().indexOf('Parse error') !== -1) {
      return str;

      // Unknown variable
    } else if (e.message.indexOf('not defined in') !== -1) {
      const badVar = e.message.split(/"/)[1];
      e.error = {
        caused_by: {
          reason: i18n.translate('visTypeTimeseries.replaceVars.errors.unknownVarDescription', {
            defaultMessage: '{badVar} is an unknown variable',
            values: { badVar: '{{' + badVar + '}}' },
          }),
          title: i18n.translate('visTypeTimeseries.replaceVars.errors.unknownVarTitle', {
            defaultMessage: 'Error processing your markdown',
          }),
        },
      };
    } else {
      e.error = {
        caused_by: {
          reason: i18n.translate('visTypeTimeseries.replaceVars.errors.markdownErrorDescription', {
            defaultMessage:
              'Please verify you are only using markdown, known variables, and built-in Handlebars expressions',
          }),
          title: i18n.translate('visTypeTimeseries.replaceVars.errors.markdownErrorTitle', {
            defaultMessage: 'Error processing your markdown',
          }),
        },
      };
    }
    return e;
  }
}
