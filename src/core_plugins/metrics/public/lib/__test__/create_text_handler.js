import sinon from 'sinon';
import { expect } from 'chai';
import createTextHandler from '../create_text_handler';

describe('createTextHandler()', () => {

  let refs;
  let handleChange;
  let changeHandler;
  let event;

  beforeEach(() => {
    refs = { test: { value: 'foo' } };
    handleChange = sinon.spy();
    changeHandler = createTextHandler(handleChange, refs);
    event = { preventDefault: sinon.spy() };
    const fn = changeHandler('test');
    fn(event);
  });

  it('calls handleChange() funciton with partial', () => {
    expect(event.preventDefault.calledOnce).to.equal(true);
    expect(handleChange.calledOnce).to.equal(true);
    expect(handleChange.firstCall.args[0]).to.eql({
      test: 'foo'
    });
  });

});

