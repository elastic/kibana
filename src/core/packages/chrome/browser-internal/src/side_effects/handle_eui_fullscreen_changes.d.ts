/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Observable } from 'rxjs';
/**
 * Some EUI component can be toggled in Full screen (e.g. the EuiDataGrid). When they are toggled in full
 * screen we want to hide the chrome, and when they are toggled back to normal we want to show the chrome.
 * @internal
 */
export declare function handleEuiFullScreenChanges({
  isVisible$,
  stop$,
  setIsVisible,
}: {
  isVisible$: Observable<boolean>;
  stop$: Observable<void>;
  setIsVisible: (isVisible: boolean) => void;
}): void;
