import sinon from 'sinon';
import { expect } from 'chai';
import createSelectHandler from '../create_select_handler';

describe('createSelectHandler()', () => {
  let handleChange;
  let changeHandler;

  beforeEach(() => {
    handleChange = sinon.spy();
    changeHandler = createSelectHandler(handleChange);
    const fn = changeHandler('test');
    fn({ value: 'foo' });
  });

  it('calls handleChange() funciton with partial', () => {
    expect(handleChange.calledOnce).to.equal(true);
    expect(handleChange.firstCall.args[0]).to.eql({
      test: 'foo'
    });
  });
});

