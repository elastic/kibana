/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FlyoutHeaderInfoBlockProps } from '../../types';
import { infoBlockPart } from './part';

/** Declarative `FlyoutTemplate.Header.InfoBlock`. */
export const InfoBlock = infoBlockPart.createComponent<FlyoutHeaderInfoBlockProps>({
  resolve: ({ title, children, size, color, 'data-test-subj': dataTestSubj }) => ({
    title,
    value: children,
    size,
    color,
    'data-test-subj': dataTestSubj,
  }),
});

InfoBlock.displayName = 'FlyoutTemplate.Header.InfoBlock';
