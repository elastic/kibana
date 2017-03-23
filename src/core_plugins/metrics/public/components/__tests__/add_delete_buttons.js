import React from 'react';
import { expect } from 'chai';
import { shallow } from 'enzyme';
import sinon from 'sinon';
import AddDeleteButtons from '../add_delete_buttons';

describe('<AddDeleteButtons />', () => {

  it('calls onAdd={handleAdd}', () => {
    const handleAdd = sinon.spy();
    const wrapper = shallow(
      <AddDeleteButtons onAdd={handleAdd} />
    );
    wrapper.find('a').at(0).simulate('click');
    expect(handleAdd.calledOnce).to.equal(true);
  });

  it('calls onDelete={handleDelete}', () => {
    const handleDelete = sinon.spy();
    const wrapper = shallow(
      <AddDeleteButtons onDelete={handleDelete} />
    );
    wrapper.find('a').at(1).simulate('click');
    expect(handleDelete.calledOnce).to.equal(true);
  });

  it('calls onClone={handleClone}', () => {
    const handleClone = sinon.spy();
    const wrapper = shallow(
      <AddDeleteButtons onClone={handleClone} />
    );
    wrapper.find('a').at(0).simulate('click');
    expect(handleClone.calledOnce).to.equal(true);
  });

  it('disableDelete={true}', () => {
    const wrapper = shallow(
      <AddDeleteButtons disableDelete={true} />
    );
    expect(wrapper.find({ text: 'Delete' })).to.have.length(0);
  });

  it('disableAdd={true}', () => {
    const wrapper = shallow(
      <AddDeleteButtons disableAdd={true} />
    );
    expect(wrapper.find({ text: 'Add' })).to.have.length(0);
  });

  it('should not display clone by default', () => {
    const wrapper = shallow(
      <AddDeleteButtons />
    );
    expect(wrapper.find({ text: 'Clone' })).to.have.length(0);
  });

  it('should not display clone when disableAdd={true}', () => {
    const fn = sinon.spy();
    const wrapper = shallow(
      <AddDeleteButtons onClone={fn} disableAdd={true} />
    );
    expect(wrapper.find({ text: 'Clone' })).to.have.length(0);
  });

});

