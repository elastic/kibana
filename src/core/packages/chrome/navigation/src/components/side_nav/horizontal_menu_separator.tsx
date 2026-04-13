/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedStyles } from '@emotion/react';

import { NAVIGATION_SELECTOR_PREFIX } from '../../constants';
import { SideNavRailRule } from './rail_rule';

export interface SideNavHorizontalMenuSeparatorProps {
  /** Extra Emotion styles on the inner rule (e.g. vertical margins). */
  css?: SerializedStyles | SerializedStyles[];
  'data-test-subj'?: string;
}

/**
 * Horizontal rule between side-nav zones; same two-div rail pattern as {@link SideNavTopRailRule}.
 */
export const SideNavHorizontalMenuSeparator = ({
  css: cssProp,
  'data-test-subj': dataTestSubj,
}: SideNavHorizontalMenuSeparatorProps) => (
  <SideNavRailRule
    data-test-subj={dataTestSubj ?? `${NAVIGATION_SELECTOR_PREFIX}-horizontalMenuSeparator`}
    ruleCss={cssProp}
  />
);
