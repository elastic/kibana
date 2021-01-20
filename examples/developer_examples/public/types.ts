/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EuiListGroupItemProps } from '@elastic/eui';

export interface ExampleDefinition {
  /**
   * The application id that is the landing page for the example.
   */
  appId: string;
  title: string;
  description: string;
  image?: string;
  /**
   * Any additional links you want to show, for example to the github README.
   */
  links?: EuiListGroupItemProps[];
}
