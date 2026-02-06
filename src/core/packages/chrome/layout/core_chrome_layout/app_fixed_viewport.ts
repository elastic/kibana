/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useRef } from 'react';
import { APP_FIXED_VIEWPORT_ID } from '@kbn/core-chrome-layout-constants';

export { APP_FIXED_VIEWPORT_ID };

export function useAppFixedViewport() {
  const ref = useRef(document.getElementById(APP_FIXED_VIEWPORT_ID) ?? undefined);
  return ref.current;
}
