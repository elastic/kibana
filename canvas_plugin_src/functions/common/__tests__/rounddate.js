import expect from 'expect.js';
import { rounddate } from '../rounddate';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';

describe('rounddate', () => {
  const fn = functionWrapper(rounddate);
  const date = new Date('2011-10-31T00:00:00.000Z').valueOf();

  it('returns date in ms from date in ms or ISO8601 string', () => {
    expect(fn(date, { _: 'YYYY' })).to.be(1293840000000);
  });

  describe('args', () => {
    describe('_', () => {
      it('sets the format for the rounded date', () => {
        expect(fn(date, { _: 'YYYY-MM' })).to.be(1317427200000);
        expect(fn(date, { _: 'YYYY-MM-DD-hh' })).to.be(1320062400000);
      });

      it('returns original date if format is not provided', () => {
        expect(fn(date)).to.be(date);
      });
    });
  });
});
