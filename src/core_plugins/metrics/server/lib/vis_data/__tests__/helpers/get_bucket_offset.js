import { expect } from 'chai';
import { getBucketKey, getBucketOffset } from '../../helpers/get_bucket_offset';


describe('getBucketOffset(end, interval)', () => {

  describe('getBucketKey(value, interval, offset)', () => {
    it('should return 30 for bucket key for 32 with an offset of 5', () => {
      expect(getBucketKey(32, 5))
        .to.equal(30);
    });

    it('should return 30 for bucket key for 30 with an offset of 5', () => {
      expect(getBucketKey(30, 5))
        .to.equal(30);
    });

  });

  it('should return an offset of -3', () => {
    expect(getBucketOffset(32, 5))
      .to.equal(-3);
  });

  it('should return an offset of -5', () => {
    expect(getBucketOffset(30, 5))
      .to.equal(-5);
  });

});
