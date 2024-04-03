/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { PipelinePanel } from './pipeline_panel';

describe('PipelinePanel', () => {
  const pipeline = {
    extract_binary_content: true,
    name: 'name',
    reduce_whitespace: true,
    run_ml_inference: true,
  };
  it('renders', () => {
    const wrapper = shallow(<PipelinePanel pipeline={pipeline} />);

    expect(wrapper).toMatchSnapshot();
  });
});
