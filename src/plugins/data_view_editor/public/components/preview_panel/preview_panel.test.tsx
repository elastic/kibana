/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { findTestSubject } from '@elastic/eui/lib/test';
import { EuiTable, EuiButtonGroup } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { INDEX_PATTERN_TYPE, MatchedItem } from '@kbn/data-views-plugin/public';
import { Props as PreviewPanelProps, PreviewPanel } from './preview_panel';
import { from } from 'rxjs';

const indices = [
  { name: 'kibana_1', tags: [] },
  { name: 'kibana_2', tags: [] },
  { name: 'es', tags: [] },
] as unknown as MatchedItem[];

describe('DataViewEditor PreviewPanel', () => {
  const commonProps: Omit<PreviewPanelProps, 'matchedIndices$' | 'title'> = {
    type: INDEX_PATTERN_TYPE.DEFAULT,
    allowHidden: false,
  };

  it('should render normally by default', async () => {
    const matchedIndices$: PreviewPanelProps['matchedIndices$'] = from([
      {
        allIndices: indices,
        exactMatchedIndices: [],
        partialMatchedIndices: [],
        visibleIndices: indices,
      },
    ]);
    const component = await mountWithIntl(
      <PreviewPanel {...commonProps} title="" matchedIndices$={matchedIndices$} />
    );

    expect(component.find(EuiTable).exists()).toBeTruthy();
    expect(component.find(EuiButtonGroup).exists()).toBeFalsy();
  });

  it('should render matching indices and can switch to all indices', async () => {
    const matchedIndices$: PreviewPanelProps['matchedIndices$'] = from([
      {
        allIndices: indices,
        exactMatchedIndices: [indices[0], indices[1]],
        partialMatchedIndices: [],
        visibleIndices: [indices[0], indices[1]],
      },
    ]);
    const component = await mountWithIntl(
      <PreviewPanel {...commonProps} title="kib*" matchedIndices$={matchedIndices$} />
    );

    expect(component.find(EuiTable).exists()).toBeTruthy();
    expect(component.find(EuiButtonGroup).exists()).toBeTruthy();

    expect(component.find('.euiButtonGroupButton-isSelected').first().text()).toBe(
      'Matching sources'
    );

    findTestSubject(component, 'allIndices').simulate('click');

    await component.update();

    expect(component.find('.euiButtonGroupButton-isSelected').first().text()).toBe('All sources');
  });

  it('should render matching indices with warnings', async () => {
    const matchedIndices$: PreviewPanelProps['matchedIndices$'] = from([
      {
        allIndices: indices,
        exactMatchedIndices: [],
        partialMatchedIndices: [indices[0], indices[1]],
        visibleIndices: [indices[0], indices[1]],
      },
    ]);
    const component = await mountWithIntl(
      <PreviewPanel {...commonProps} title="kib*" matchedIndices$={matchedIndices$} />
    );

    expect(component.find(EuiTable).exists()).toBeTruthy();
    expect(component.find(EuiButtonGroup).exists()).toBeTruthy();
  });

  it('should render all indices tab when ends with a comma and can switch to matching sources', async () => {
    const matchedIndices$: PreviewPanelProps['matchedIndices$'] = from([
      {
        allIndices: indices,
        exactMatchedIndices: [indices[0]],
        partialMatchedIndices: [],
        visibleIndices: [indices[0]],
      },
    ]);
    const component = await mountWithIntl(
      <PreviewPanel {...commonProps} title="kibana_1," matchedIndices$={matchedIndices$} />
    );

    expect(component.find(EuiTable).exists()).toBeTruthy();
    expect(component.find(EuiButtonGroup).exists()).toBeTruthy();

    expect(component.find('.euiButtonGroupButton-isSelected').first().text()).toBe('All sources');

    findTestSubject(component, 'onlyMatchingIndices').simulate('click');

    await component.update();

    expect(component.find('.euiButtonGroupButton-isSelected').first().text()).toBe(
      'Matching sources'
    );
  });
});
