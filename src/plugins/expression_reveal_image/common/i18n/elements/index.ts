/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { revealImage } from './dict';

/**
 * Help text for Canvas Functions should be properly localized. This function will
 * return a dictionary of help strings, organized by `ExpressionFunctionDefinition`
 * specification and then by available arguments within each `ExpressionFunctionDefinition`.
 *
 * This a function, rather than an object, to future-proof string initialization,
 * if ever necessary.
 */
export const getElementsStrings = () => ({
  revealImage,
});
