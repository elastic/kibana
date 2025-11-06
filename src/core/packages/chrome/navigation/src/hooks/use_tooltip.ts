/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiToolTip } from '@elastic/eui';
import { useCallback, useRef } from 'react';

/**
 * Custom hook to manage tooltip visibility
 *
 * TODO: both of the `EuiToolTip` usages use `disableScreenReaderOutput`
 * Likely for such usages, the tooltip should fade out on mouse out
 * and not be persisted. The a11y argument no longer applies.
 */
export const useTooltip = () => {
  const tooltipRef = useRef<EuiToolTip | null>(null);

  const handleMouseOut = useCallback(() => {
    tooltipRef.current?.hideToolTip();
  }, []);

  return { tooltipRef, handleMouseOut };
};
