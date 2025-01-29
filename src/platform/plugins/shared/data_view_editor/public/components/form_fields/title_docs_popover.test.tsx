/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { TitleDocsPopover } from './title_docs_popover';

describe('DataViewEditor TitleDocsPopover', () => {
  it('should render normally', async () => {
    const component = mountWithIntl(<TitleDocsPopover />);

    expect(findTestSubject(component, 'indexPatternDocsButton').exists()).toBeTruthy();
    expect(findTestSubject(component, 'indexPatternDocsPopoverContent').exists()).toBeFalsy();

    findTestSubject(component, 'indexPatternDocsButton').simulate('click');

    await component.update();

    expect(findTestSubject(component, 'indexPatternDocsPopoverContent').exists()).toBeTruthy();
  });
});
