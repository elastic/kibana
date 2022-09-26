/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { StatusBadge, StatusWithoutMessage } from './status_badge';

const getStatus = (parts: Partial<StatusWithoutMessage> = {}): StatusWithoutMessage => ({
  id: 'available',
  title: 'Green',
  uiColor: 'secondary',
  ...parts,
});

describe('StatusBadge', () => {
  it('propagates the correct properties to `EuiBadge`', () => {
    const status = getStatus();

    const component = shallowWithIntl(<StatusBadge status={status} />);

    expect(component).toMatchInlineSnapshot(`
      <EuiBadge
        aria-label="Green"
        color="secondary"
      >
        Green
      </EuiBadge>
    `);
  });

  it('propagates `data-test-subj` if provided', () => {
    const status = getStatus({
      id: 'critical',
      title: 'Red',
      uiColor: 'danger',
    });

    const component = shallowWithIntl(
      <StatusBadge status={status} data-test-subj="my-data-test-subj" />
    );

    expect(component).toMatchInlineSnapshot(`
      <EuiBadge
        aria-label="Red"
        color="danger"
        data-test-subj="my-data-test-subj"
      >
        Red
      </EuiBadge>
    `);
  });
});
