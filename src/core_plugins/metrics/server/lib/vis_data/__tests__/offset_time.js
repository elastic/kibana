import { expect } from 'chai';
import moment from 'moment';
import offsetTime from '../offset_time';

describe('offsetTime(req, by)', () => {
  it('should return a moment object for to and from', () => {
    const req = {
      payload: {
        timerange: {
          min: '2017-01-01T00:00:00Z',
          max: '2017-01-01T01:00:00Z'
        }
      }
    };
    const { from, to } = offsetTime(req, '');
    expect(moment.isMoment(from)).to.equal(true);
    expect(moment.isMoment(to)).to.equal(true);
    expect(moment.utc('2017-01-01T00:00:00Z')
      .isSame(from)).to.equal(true);
    expect(moment.utc('2017-01-01T01:00:00Z')
      .isSame(to)).to.equal(true);
  });

  it('should return a moment object for to and from offset by 1 hour', () => {
    const req = {
      payload: {
        timerange: {
          min: '2017-01-01T00:00:00Z',
          max: '2017-01-01T01:00:00Z'
        }
      }
    };
    const { from, to } = offsetTime(req, '1h');
    expect(moment.isMoment(from)).to.equal(true);
    expect(moment.isMoment(to)).to.equal(true);
    expect(moment.utc('2017-01-01T00:00:00Z').subtract(1, 'h')
      .isSame(from)).to.equal(true);
    expect(moment.utc('2017-01-01T01:00:00Z').subtract(1, 'h')
      .isSame(to)).to.equal(true);
  });

});

