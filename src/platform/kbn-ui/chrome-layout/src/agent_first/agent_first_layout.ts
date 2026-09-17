/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AGENT_FIRST_GAP } from '../constants';
import type { LayoutConfig } from '../layout_config_context';

export const AGENT_FIRST_LAYOUT_OVERRIDES: Pick<
  LayoutConfig,
  | 'applicationMarginRight'
  | 'applicationMarginBottom'
  | 'applicationMarginTop'
  | 'agentMarginLeft'
  | 'headerHeight'
> = {
  applicationMarginRight: AGENT_FIRST_GAP,
  applicationMarginBottom: AGENT_FIRST_GAP,
  applicationMarginTop: AGENT_FIRST_GAP,
  agentMarginLeft: AGENT_FIRST_GAP,
  headerHeight: 0,
};
