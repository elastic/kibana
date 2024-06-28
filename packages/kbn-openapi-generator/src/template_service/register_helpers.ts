/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type Handlebars from '@kbn/handlebars';
import { HelperOptions } from 'handlebars';
import { snakeCase, camelCase } from 'lodash';

export function registerHelpers(handlebarsInstance: typeof Handlebars) {
  handlebarsInstance.registerHelper('concat', (...args) => {
    const values = args.slice(0, -1) as unknown[];
    return values.join('');
  });
  handlebarsInstance.registerHelper('snakeCase', snakeCase);
  handlebarsInstance.registerHelper('camelCase', camelCase);
  handlebarsInstance.registerHelper('toJSON', (value: unknown) => {
    return JSON.stringify(value);
  });
  handlebarsInstance.registerHelper('includes', (array: unknown, value: unknown) => {
    if (!Array.isArray(array)) {
      return false;
    }
    return array.includes(value);
  });
  handlebarsInstance.registerHelper('or', (...args) => {
    // Last arguments is the handlebars context, so we ignore it
    return args.slice(0, -1).some((arg) => arg);
  });
  handlebarsInstance.registerHelper('eq', (a, b) => {
    return a === b;
  });
  handlebarsInstance.registerHelper('defined', (val) => {
    return val !== undefined;
  });
  handlebarsInstance.registerHelper('first', (val) => {
    return Array.isArray(val) ? val[0] : val;
  });
  handlebarsInstance.registerHelper('isSingle', (val) => {
    return Array.isArray(val) && val.length === 1;
  });
  /**
   * Check if the OpenAPI schema is unknown
   */
  handlebarsInstance.registerHelper('isUnknown', (val: object) => {
    return !('type' in val || '$ref' in val || 'anyOf' in val || 'oneOf' in val || 'allOf' in val);
  });
  handlebarsInstance.registerHelper(
    'replace',
    (val: string, searchValue: string, replaceValue: string) => {
      return val.replace(searchValue, replaceValue);
    }
  );

  /**
   * Checks whether provided reference is a known circular reference or a part of circular chain.
   *
   * It's expected that `context.recursiveRefs` has been filled by the parser.
   */
  handlebarsInstance.registerHelper('isCircularRef', (ref: string, options: HelperOptions) => {
    if (!options.data?.root?.circularRefs) {
      return false;
    }

    const circularRefs: Set<string> = options.data.root.circularRefs;

    return circularRefs.has(ref);
  });

  /**
   * Checks whether provided schema is circular or a part of the circular chain.
   *
   * It's expected that `context.circularRefs` has been filled by the parser.
   */
  handlebarsInstance.registerHelper(
    'isCircularSchema',
    (schemaName: string, options: HelperOptions) => {
      if (!options.data?.root?.circularRefs) {
        return false;
      }

      const circularRefs: Set<string> = options.data.root.circularRefs;

      return circularRefs.has(`#/components/schemas/${schemaName}`);
    }
  );
}
