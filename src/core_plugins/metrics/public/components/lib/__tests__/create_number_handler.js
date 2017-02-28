import sinon from 'sinon';
import { expect } from 'chai';
import createNumberHandler from '../create_number_handler';

describe('createNumberHandler()', () => {

  let handleChange;
  let changeHandler;
  let event;

  beforeEach(() => {
    handleChange = sinon.spy();
    changeHandler = createNumberHandler(handleChange);
    event = { preventDefault: sinon.spy(), target: { value: '1' } };
    const fn = changeHandler('test');
    fn(event);
  });

  it('calls handleChange() funciton with partial', () => {
    expect(event.preventDefault.calledOnce).to.equal(true);
    expect(handleChange.calledOnce).to.equal(true);
    expect(handleChange.firstCall.args[0]).to.eql({
      test: 1
    });
  });

});
