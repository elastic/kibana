/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElementFactory } from '../../common/types';

export const revealImage: ElementFactory = () => ({
  name: 'revealImage',
  displayName: 'Image reveal',
  type: 'image',
  help: 'Reveals a percentage of an image',
  expression: `filters
| demodata
| math "mean(percent_uptime)"
| revealImage origin=bottom image=null
| render`,
});
