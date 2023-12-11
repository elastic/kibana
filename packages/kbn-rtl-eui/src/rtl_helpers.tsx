/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Components using the @kbn/i18n module require access to the intl context.
 * This is not available when mounting single components in Enzyme.
 * These helper functions aim to address that and wrap a valid,
 * intl context around them.
 */

import { screen, within } from '@testing-library/react';

export const getButtonGroupInputValue = (testId: string) => () => {
  const buttonGroup = screen.getByTestId(testId);
  const options = within(buttonGroup).getAllByRole('radio');
  const checkedOption = options.find((option) => option.getAttribute('checked') === '');
  if (checkedOption == null) {
    throw new Error(`No checked option found in button group ${testId}`);
  }
  return checkedOption.nextSibling;
};
