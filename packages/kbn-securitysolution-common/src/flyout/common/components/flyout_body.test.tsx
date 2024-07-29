/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { FlyoutBody } from './flyout_body';

const text = 'some text';
const dataTestSubj = 'flyout body';

describe('<FlyoutBody />', () => {
  it('should render body', () => {
    const { getByTestId } = render(<FlyoutBody data-test-subj={dataTestSubj}>{text}</FlyoutBody>);
    expect(getByTestId(dataTestSubj)).toBeInTheDocument();
    expect(getByTestId(dataTestSubj)).toHaveTextContent(text);
  });
});
