import sinon from 'sinon';
import { expect } from 'chai';
import buildProcessorFunction from '../build_processor_function';

describe('buildProcessorFunction(chain, ...args)', () => {
  const req = {};
  const panel = {};
  const series = {};

  it('should call each processor', () => {
    const first = sinon.spy(() => next => doc => next(doc));
    const second = sinon.spy(() => next => doc => next(doc));
    buildProcessorFunction([first, second], req, panel, series);
    expect(first.calledOnce).to.equal(true);
    expect(second.calledOnce).to.equal(true);
  });

  it('should chain each processor', () => {
    const first = sinon.spy(next => doc => next(doc));
    const second = sinon.spy(next => doc => next(doc));

    buildProcessorFunction([
      () => first,
      () => second
    ], req, panel, series);

    expect(first.calledOnce).to.equal(true);
    expect(second.calledOnce).to.equal(true);
  });

  it('should next of each processor', () => {
    const first = sinon.spy();
    const second = sinon.spy();
    const fn = buildProcessorFunction([
      () => next => doc => {
        first();
        next(doc);
      },
      () => next => doc => {
        second();
        next(doc);
      }
    ], req, panel, series);
    fn({});
    expect(first.calledOnce).to.equal(true);
    expect(second.calledOnce).to.equal(true);
  });

});
