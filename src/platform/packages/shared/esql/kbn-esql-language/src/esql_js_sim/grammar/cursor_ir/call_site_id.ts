/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GRAMMAR_LABELS } from '../grammar_labels/grammar_labels.generated';
import type { CallSiteId } from './types';

const labelsByState = new Map(GRAMMAR_LABELS.map((label) => [label.state, label]));

/**
 * The id of the place where `rule` calls `called`: `rule.label` when the grammar labels the
 * call at that ATN state, `rule>called` otherwise.
 */
export const callSiteId = (rule: string, called: string, invokingState?: number): CallSiteId => {
  const label = invokingState === undefined ? undefined : labelsByState.get(invokingState);

  return label && label.rule === rule && label.invokes === called
    ? `${rule}.${label.label}`
    : `${rule}>${called}`;
};
