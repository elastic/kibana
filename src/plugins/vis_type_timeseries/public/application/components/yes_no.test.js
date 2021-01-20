/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { expect } from 'chai';
import { shallowWithIntl } from '@kbn/test/jest';
import sinon from 'sinon';
import { YesNo } from './yes_no';

describe('YesNo', () => {
  it('call onChange={handleChange} on yes', () => {
    const handleChange = sinon.spy();
    const wrapper = shallowWithIntl(<YesNo name="test" onChange={handleChange} />);
    wrapper.find('EuiRadio').first().simulate('change');
    expect(handleChange.calledOnce).to.equal(true);
    expect(handleChange.firstCall.args[0]).to.eql({
      test: 1,
    });
  });

  it('call onChange={handleChange} on no', () => {
    const handleChange = sinon.spy();
    const wrapper = shallowWithIntl(<YesNo name="test" onChange={handleChange} />);
    wrapper.find('EuiRadio').last().simulate('change');
    expect(handleChange.calledOnce).to.equal(true);
    expect(handleChange.firstCall.args[0]).to.eql({
      test: 0,
    });
  });
});
