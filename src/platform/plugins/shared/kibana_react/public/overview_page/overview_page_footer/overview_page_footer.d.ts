/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC, MouseEvent } from 'react';
interface Props {
  addBasePath: (path: string) => string;
  /** The path to set as the new default route in advanced settings */
  path: string;
  /** Callback function to invoke when the user wants to set their default route to the current page */
  onSetDefaultRoute?: (event: MouseEvent) => void;
  /** Callback function to invoke when the user wants to change their default route button is changed */
  onChangeDefaultRoute?: (event: MouseEvent) => void;
}
export declare const OverviewPageFooter: FC<Props>;
export {};
