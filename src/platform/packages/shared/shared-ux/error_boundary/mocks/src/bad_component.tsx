/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButton } from '@elastic/eui';
import { action } from '@storybook/addon-actions';
import React, { useState } from 'react';

export const BadComponent = () => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    throw new Error('This is an error to show the test user!'); // custom error
  }

  const clickedForError = action('clicked for error');
  const handleClick = () => {
    clickedForError();
    setHasError(true);
  };

  return (
    <EuiButton onClick={handleClick} data-test-subj="clickForErrorBtn">
      Click for error
    </EuiButton>
  );
};
