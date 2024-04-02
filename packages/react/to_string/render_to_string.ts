/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { render } from 'react-dom';

/**
 * Returns a static HTML string version of a React Element
 * @param element
 */
export function renderToString(element: JSX.Element): string {
  const div = document.createElement('div');
  render(element, div);
  return div.innerHTML; // For example, "<svg>...</svg>"
}
