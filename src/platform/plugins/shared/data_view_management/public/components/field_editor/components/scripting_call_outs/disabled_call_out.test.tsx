/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { ScriptingDisabledCallOut } from './disabled_call_out';
import { screen } from '@testing-library/react';

describe('ScriptingDisabledCallOut', () => {
  it('should render normally', async () => {
    renderWithI18n(<ScriptingDisabledCallOut isVisible={true} />);

    expect(screen.getByText('Scripting disabled')).toBeVisible();
    expect(
      screen.getByText(
        'All inline scripting has been disabled in Elasticsearch. You must enable inline scripting for at least one language in order to use scripted fields in Kibana.'
      )
    ).toBeVisible();
  });

  it('should render nothing if not visible', async () => {
    const { container } = renderWithI18n(<ScriptingDisabledCallOut />);

    expect(container).toBeEmptyDOMElement();
  });
});
