/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import dateMath from '@elastic/datemath';

export const GTE_INTERVAL_RE = new RegExp(`^>=([\\d\\.]+\\s*(${dateMath.units.join('|')}))$`);
export const INTERVAL_STRING_RE = new RegExp(`^([\\d\\.]+)\\s*(${dateMath.units.join('|')})$`);
