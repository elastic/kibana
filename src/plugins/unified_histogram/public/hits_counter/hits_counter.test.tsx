/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import type { ReactWrapper } from 'enzyme';
import type { HitsCounterProps } from './hits_counter';
import { HitsCounter } from './hits_counter';
import { findTestSubject } from '@elastic/eui/lib/test';
import { EuiLoadingSpinner } from '@elastic/eui';
import { UnifiedHistogramFetchStatus } from '../types';

describe('hits counter', function () {
  let props: HitsCounterProps;
  let component: ReactWrapper<HitsCounterProps>;

  beforeAll(() => {
    props = {
      hits: {
        status: UnifiedHistogramFetchStatus.complete,
        total: 2,
      },
    };
  });

  it('expect to render the number of hits', function () {
    component = mountWithIntl(<HitsCounter {...props} />);
    const hits = findTestSubject(component, 'unifiedHistogramQueryHits');
    expect(hits.text()).toBe('2');
  });

  it('expect to render 1,899 hits if 1899 hits given', function () {
    component = mountWithIntl(
      <HitsCounter
        {...props}
        hits={{ status: UnifiedHistogramFetchStatus.complete, total: 1899 }}
      />
    );
    const hits = findTestSubject(component, 'unifiedHistogramQueryHits');
    expect(hits.text()).toBe('1,899');
  });

  it('should render the element passed to the append prop', () => {
    const appendHitsCounter = <div data-test-subj="appendHitsCounter">appendHitsCounter</div>;
    component = mountWithIntl(<HitsCounter {...props} append={appendHitsCounter} />);
    expect(findTestSubject(component, 'appendHitsCounter').length).toBe(1);
  });

  it('should render a EuiLoadingSpinner when status is partial', () => {
    component = mountWithIntl(
      <HitsCounter {...props} hits={{ status: UnifiedHistogramFetchStatus.partial, total: 2 }} />
    );
    expect(component.find(EuiLoadingSpinner).length).toBe(1);
  });

  it('should render unifiedHistogramQueryHitsPartial when status is partial', () => {
    component = mountWithIntl(
      <HitsCounter {...props} hits={{ status: UnifiedHistogramFetchStatus.partial, total: 2 }} />
    );
    expect(component.find('[data-test-subj="unifiedHistogramQueryHitsPartial"]').length).toBe(1);
  });

  it('should render unifiedHistogramQueryHits when status is complete', () => {
    component = mountWithIntl(<HitsCounter {...props} />);
    expect(component.find('[data-test-subj="unifiedHistogramQueryHits"]').length).toBe(1);
  });
});
