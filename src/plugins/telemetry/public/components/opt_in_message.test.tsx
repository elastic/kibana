/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { OptInMessage } from './opt_in_message';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { docLinksServiceMock } from '../../../../core/public/doc_links/doc_links_service.mock';

const mockDocLinks = docLinksServiceMock.createStartContract();

describe('OptInMessage', () => {
  it('renders as expected', () => {
    expect(shallowWithIntl(<OptInMessage docLinks={mockDocLinks} />)).toMatchSnapshot();
  });
});
