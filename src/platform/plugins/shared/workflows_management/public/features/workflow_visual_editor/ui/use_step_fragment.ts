/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { ParsedStepFragment } from '../lib/parse_step_fragment';
import { parseStepFragment } from '../lib/parse_step_fragment';

/** The step fragment, parsed once per text however many places read it. */
export const useStepFragment = (text: string): ParsedStepFragment =>
  useMemo(() => parseStepFragment(text), [text]);
