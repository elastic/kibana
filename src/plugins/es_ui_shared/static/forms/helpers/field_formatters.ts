/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * NOTE: The toInt() formatter does _not_ play well if we enter the "e" letter in a "number" input
 * as it does not trigger an "onChange" event.
 * I searched if it was a bug and found this thread (https://github.com/facebook/react/pull/7359#event-1017024857)
 * We will need to investigate this a little further.
 *
 * @param value The string value to convert to number
 */
export const toInt = (value: string): number => parseFloat(value);
