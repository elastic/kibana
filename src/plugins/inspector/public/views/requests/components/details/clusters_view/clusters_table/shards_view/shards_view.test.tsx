/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { estypes } from '@elastic/elasticsearch';
import { shallow } from 'enzyme';
import { ShardsView } from './shards_view';

describe('render', () => {
  test('should render with no failures', () => {
    const shardsDetails = {
      total: 2,
      successful: 2,
      skipped: 0,
      failed: 0,
    };
    const wrapper = shallow(<ShardsView failures={[]} shardsDetails={shardsDetails} />);
    expect(wrapper).toMatchSnapshot();
  });

  test('should render with failures', () => {
    const shardsDetails = {
      total: 2,
      successful: 1,
      skipped: 0,
      failed: 1,
    };
    const wrapper = shallow(
      <ShardsView
        failures={[{} as unknown as estypes.ShardFailure]}
        shardsDetails={shardsDetails}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  test('should not render when no shard details are provided', () => {
    const wrapper = shallow(<ShardsView failures={[]} />);
    expect(wrapper).toMatchSnapshot();
  });
});
