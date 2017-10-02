import { expect } from 'chai';
import { getAxisLabelString } from '../get_axis_label_string';

describe('getAxisLabelString(interval)', () => {
  it('should return a valid label for 10 seconds', () => {
    expect(getAxisLabelString(10000)).to.equal('per 10 seconds');
  });
  it('should return a valid label for 2 minutes', () => {
    expect(getAxisLabelString(120000)).to.equal('per 2 minutes');
  });
  it('should return a valid label for 2 hour', () => {
    expect(getAxisLabelString(7200000)).to.equal('per 2 hours');
  });
});


