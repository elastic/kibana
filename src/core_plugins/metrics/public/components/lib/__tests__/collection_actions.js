import sinon from 'sinon';
import { expect } from 'chai';
import {
  handleChange,
  handleAdd,
  handleDelete
} from '../collection_actions';

describe('collection actions', () => {

  it('handleChange() calls props.onChange() with updated collection', () => {
    const fn = sinon.spy();
    const props = {
      model: { test: [{ id: 1, title: 'foo' }] },
      name: 'test',
      onChange: fn
    };
    handleChange.call(null, props, { id: 1, title: 'bar' });
    expect(fn.calledOnce).to.equal(true);
    expect(fn.firstCall.args[0]).to.eql({
      test: [{ id:1, title: 'bar' }]
    });
  });

  it('handleAdd() calls props.onChange() with update collection', () => {
    const newItemFn = sinon.stub().returns({ id: 2, title: 'example' });
    const fn = sinon.spy();
    const props = {
      model: { test: [{ id: 1, title: 'foo' }] },
      name: 'test',
      onChange: fn
    };
    handleAdd.call(null, props, newItemFn);
    expect(fn.calledOnce).to.equal(true);
    expect(newItemFn.calledOnce).to.equal(true);
    expect(fn.firstCall.args[0]).to.eql({
      test: [{ id:1, title: 'foo' }, { id: 2, title: 'example' }]
    });
  });

  it('handleDelete() calls props.onChange() with update collection', () => {
    const fn = sinon.spy();
    const props = {
      model: { test: [{ id: 1, title: 'foo' }] },
      name: 'test',
      onChange: fn
    };
    handleDelete.call(null, props, { id: 1 });
    expect(fn.calledOnce).to.equal(true);
    expect(fn.firstCall.args[0]).to.eql({
      test: []
    });
  });




});
