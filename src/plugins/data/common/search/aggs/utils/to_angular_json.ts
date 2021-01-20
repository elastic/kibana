/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * An inlined version of angular.toJSON(). Source:
 * https://github.com/angular/angular.js/blob/master/src/Angular.js#L1312
 *
 * @internal
 */
export function toAngularJSON(obj: any, pretty?: any): string {
  if (obj === undefined) return '';
  if (typeof pretty === 'number') {
    pretty = pretty ? 2 : null;
  }
  return JSON.stringify(obj, toJsonReplacer, pretty);
}

function isWindow(obj: any) {
  return obj && obj.window === obj;
}

function isScope(obj: any) {
  return obj && obj.$evalAsync && obj.$watch;
}

function toJsonReplacer(key: any, value: any) {
  let val = value;

  if (typeof key === 'string' && key.charAt(0) === '$' && key.charAt(1) === '$') {
    val = undefined;
  } else if (isWindow(value)) {
    val = '$WINDOW';
  } else if (value && window.document === value) {
    val = '$DOCUMENT';
  } else if (isScope(value)) {
    val = '$SCOPE';
  }

  return val;
}
