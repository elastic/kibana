/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { EuiIcon } from '@elastic/eui';
import { getUiSessionMock } from '../../../__mocks__';
import type { SearchSessionsMgmtAPI } from '../../../lib/api';
import { createExtendActionDescriptor } from './extend_button';

describe('createExtendActionDescriptor', () => {
  it('renders the Extend action icon as an inline SVG', () => {
    const descriptor = createExtendActionDescriptor(
      {} as SearchSessionsMgmtAPI,
      getUiSessionMock(),
      coreMock.createStart()
    );

    const { container } = render(<EuiIcon type={descriptor.iconType} />);

    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });
});
