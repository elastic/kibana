/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Screen } from '@testing-library/react';
import { screen, within } from '@testing-library/react';

/**
 * Helper function to get the selected button in a button group
 */
export const getSelectedButtonInGroup =
  (testId: string, container: Screen | ReturnType<typeof within> = screen) =>
  () => {
    const buttonGroup = container.getByTestId(testId);
    return within(buttonGroup).getByRole('button', { pressed: true });
  };
