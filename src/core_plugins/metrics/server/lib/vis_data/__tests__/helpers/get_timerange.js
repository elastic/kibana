import { expect } from 'chai';
import getTimerange from '../../helpers/get_timerange';
import moment from 'moment';

describe('getTimerange(req)', () => {
  it('should return a moment object for to and from', () => {
    const req = {
      payload: {
        timerange: {
          min: '2017-01-01T00:00:00Z',
          max: '2017-01-01T01:00:00Z'
        }
      }
    };
    const { from, to } = getTimerange(req);
    expect(moment.isMoment(from)).to.equal(true);
    expect(moment.isMoment(to)).to.equal(true);
    expect(moment.utc('2017-01-01T00:00:00Z')
      .isSame(from)).to.equal(true);
    expect(moment.utc('2017-01-01T01:00:00Z')
      .isSame(to)).to.equal(true);
  });
});
