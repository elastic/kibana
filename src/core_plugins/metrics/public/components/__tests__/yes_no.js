import React from 'react';
import { expect } from 'chai';
import { shallow } from 'enzyme';
import sinon from 'sinon';
import YesNo from '../yes_no';

describe('<YesNo />', () => {

  it('call onChange={handleChange} on yes', () => {
    const handleChange = sinon.spy();
    const wrapper = shallow(
      <YesNo name="test" onChange={handleChange} />
    );
    wrapper.find('input').first().simulate('change');
    expect(handleChange.calledOnce).to.equal(true);
    expect(handleChange.firstCall.args[0]).to.eql({
      test: 1
    });
  });

  it('call onChange={handleChange} on no', () => {
    const handleChange = sinon.spy();
    const wrapper = shallow(
      <YesNo name="test" onChange={handleChange} />
    );
    wrapper.find('input').last().simulate('change');
    expect(handleChange.calledOnce).to.equal(true);
    expect(handleChange.firstCall.args[0]).to.eql({
      test: 0
    });
  });

});
