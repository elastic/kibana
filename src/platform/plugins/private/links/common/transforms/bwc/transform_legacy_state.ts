/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { StoredLinksState } from "../types";
import { StoredLinksState910 } from "./types";

export function transformLegacyState(state: StoredLinksState910): StoredLinksState {
  // 9.1.0 by-value state stored state under attributes
  const { attributes, ...rest } = state;
  return {
    ...attributes,
    ...rest,
  };
}