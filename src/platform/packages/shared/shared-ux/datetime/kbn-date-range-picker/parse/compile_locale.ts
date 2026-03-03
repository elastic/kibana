/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ParserLocale } from '../types';

interface CompiledTemplate {
  regex: RegExp;
  countGroup: number;
  unitGroup: number;
}

export interface CompiledLocale {
  shorthandRegex: RegExp;
  durationPast: CompiledTemplate[];
  durationFuture: CompiledTemplate[];
  instantPast: CompiledTemplate[];
  instantFuture: CompiledTemplate[];
  absoluteFormats: string[];
}

const localeCache = new WeakMap<ParserLocale, CompiledLocale>();

// TODO move to utils
export const escapeRegExp = (input: string) => input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Returns a compiled locale, caching by object identity. */
export function compileParserLocale(locale: ParserLocale): CompiledLocale {
  let compiledLocale = localeCache.get(locale);
  if (!compiledLocale) {
    compiledLocale = compileLocale(locale);
    localeCache.set(locale, compiledLocale);
  }
  return compiledLocale;
}

function compileLocale(locale: ParserLocale): CompiledLocale {
  const unitKeys = Object.keys(locale.unitAliases)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|');

  return {
    shorthandRegex: new RegExp(`^(now)?([+-]?)(\\d+)(${unitKeys})(\\/[smhdwMy])?$`),
    durationPast: locale.naturalDuration.past.map(compileTemplate),
    durationFuture: locale.naturalDuration.future.map(compileTemplate),
    instantPast: locale.naturalInstant.past.map(compileTemplate),
    instantFuture: locale.naturalInstant.future.map(compileTemplate),
    absoluteFormats: locale.absoluteFormats,
  };
}

/**
 * Converts a natural-language template (e.g. `'{count} {unit} ago'`)
 * into a regex, tracking capture-group positions for count and unit.
 */
function compileTemplate(template: string): CompiledTemplate {
  const parts = template.split(/(\{count}|\{unit})/);
  let pattern = '';
  let groupIdx = 0;
  let countGroup = -1;
  let unitGroup = -1;

  for (const part of parts) {
    if (part === '{count}') {
      countGroup = ++groupIdx;
      pattern += '(\\d+)';
    } else if (part === '{unit}') {
      unitGroup = ++groupIdx;
      pattern += '(\\w+)';
    } else {
      pattern += escapeRegExp(part).replace(/ /g, '\\s+');
    }
  }

  return { regex: new RegExp(`^${pattern}$`, 'i'), countGroup, unitGroup };
}
