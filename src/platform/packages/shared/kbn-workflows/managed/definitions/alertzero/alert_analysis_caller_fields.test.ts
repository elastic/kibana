/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ALERT_ANALYSIS_FIELDS } from './alert_analysis_caller_fields';
import ALERT_ANALYSIS_YAML from '../alert_analysis/alert_analysis_workflow.yaml';

// Ends on a word character so the full stop of a comment sentence is not read as part of a path.
const PATH = '[A-Za-z_@](?:[A-Za-z0-9_@.]*[A-Za-z0-9_])?';
const QUOTED = `\\["(${PATH})"\\]|\\['(${PATH})'\\]`;

// Every way the YAML reads a field off a caller alert: the `a` alias of the prompt loop and the
// filters, `inputs.alerts[0]`, `map` over `inputs.alerts`, and the loops over the alerts (see `FOREACH_ITEM`).
const READS = [
  new RegExp(`\\ba(?:\\.(${PATH})|${QUOTED})`, 'g'),
  new RegExp(`inputs\\.alerts\\[0\\](?:\\.(${PATH})|${QUOTED})`, 'g'),
  new RegExp(`inputs\\.alerts \\| map: '(${PATH})'`, 'g'),
];

const FOREACH_ITEM = new RegExp(`foreach\\.item\\.(${PATH})`, 'g');

// `foreach.item` is an alert in some loops and something else in others. These are the reads of
// the loops that are not over alerts (threat tactics and techniques) plus `size` of a list. Any
// other `foreach.item.<path>` is taken to be an alert field, so a new one fails the test until it is
// either added to ALERT_ANALYSIS_FIELDS or, if its loop is not over alerts, listed here.
const NOT_ALERT_FOREACH_FIELDS = [
  '_id',
  '_index',
  'size',
  'name',
  'id',
  'tactic.name',
  'tactic.id',
  'technique',
];

const readFields = (): Set<string> => {
  const found = READS.flatMap((pattern) =>
    [...ALERT_ANALYSIS_YAML.matchAll(pattern)].map(
      ([, dotted, double, single]) => dotted ?? double ?? single
    )
  ).filter((path) => path !== '_id' && path !== '_index' && path !== 'size');
  const foreachFound = [...ALERT_ANALYSIS_YAML.matchAll(FOREACH_ITEM)]
    .map(([, path]) => path)
    .filter((path) => !NOT_ALERT_FOREACH_FIELDS.includes(path));
  return new Set([...found, ...foreachFound]);
};

describe('ALERT_ANALYSIS_FIELDS', () => {
  const read = readFields();

  // A broken scan finds nothing and would pass the subset check below.
  it('finds the prompt fields known today in the Alert Analysis workflow', () => {
    expect(read.size).toBeGreaterThanOrEqual(40);
  });

  it('lists every field the Alert Analysis workflow reads off a caller alert', () => {
    const missing = [...read].filter(
      (path) => !(ALERT_ANALYSIS_FIELDS as readonly string[]).includes(path)
    );

    // Add the field to ALERT_ANALYSIS_FIELDS in alert_analysis_caller_fields.ts, or the Worker
    // loads alerts without it and the prompt silently loses it.
    expect(missing).toEqual([]);
  });
});
