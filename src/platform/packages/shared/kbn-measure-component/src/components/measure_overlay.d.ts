/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { Dispatch, SetStateAction } from 'react';
interface Props {
  setIsMeasuring: Dispatch<SetStateAction<boolean>>;
}
/**
 * MeasureOverlay provides visual measurements between components.
 * - Click to select an anchor element.
 * - Hover over other elements to see spacing distances between anchor and hovered element.
 * - Click again to select a new anchor, or press Escape to exit.
 */
export declare const MeasureOverlay: ({ setIsMeasuring }: Props) => React.JSX.Element;
export {};
