/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { action } from '@storybook/addon-actions';
import { APP_BASE_PATH, sectionsMock } from './mocks';

export const mockProps = {
  appBasePath: APP_BASE_PATH,
  sections: sectionsMock,
  onCardClick: (e: any) => {
    e.preventDefault();
    action('Navigate to: ', e.target.href);
  },
};
