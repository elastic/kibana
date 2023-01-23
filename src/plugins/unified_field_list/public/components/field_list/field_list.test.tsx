/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiText, EuiProgress } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { FieldList } from './field_list';

describe('UnifiedFieldList <FieldList />', () => {
  it('should render correctly when processing', async () => {
    expect(mountWithIntl(<FieldList isProcessing={true} />).find(EuiProgress)?.length).toBe(1);
    expect(mountWithIntl(<FieldList isProcessing={false} />).find(EuiProgress)?.length).toBe(0);
  });

  it('should render correctly with content', async () => {
    const wrapper = mountWithIntl(
      <FieldList isProcessing={false}>
        <EuiText>{'content'}</EuiText>
      </FieldList>
    );

    expect(wrapper.find(EuiText).first().text()).toBe('content');
  });

  it('should render correctly with additional elements', async () => {
    const wrapper = mountWithIntl(
      <FieldList
        isProcessing={false}
        prepend={<EuiText>{'prepend'}</EuiText>}
        append={<EuiText>{'append'}</EuiText>}
      >
        <EuiText>{'content'}</EuiText>
      </FieldList>
    );

    expect(wrapper.find(EuiText).first().text()).toBe('prepend');
    expect(wrapper.find(EuiText).at(1).text()).toBe('content');
    expect(wrapper.find(EuiText).at(2).text()).toBe('append');
  });
});
