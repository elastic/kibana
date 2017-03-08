import { expect } from 'chai';
import getBucketSize from '../../helpers/get_bucket_size';

describe('getBucketSize', () => {
  const req = {
    payload: {
      timerange: {
        min: '2017-01-01T00:00:00.000Z',
        max: '2017-01-01T01:00:00.000Z',
      }
    }
  };

  it('returns auto calulated buckets', () => {
    const result = getBucketSize(req, 'auto');
    expect(result).to.have.property('bucketSize', 30);
    expect(result).to.have.property('intervalString', '30s');
  });

  it('returns overriden buckets (1s)', () => {
    const result = getBucketSize(req, '1s');
    expect(result).to.have.property('bucketSize', 1);
    expect(result).to.have.property('intervalString', '1s');
  });

  it('returns overriden buckets (10m)', () => {
    const result = getBucketSize(req, '10m');
    expect(result).to.have.property('bucketSize', 600);
    expect(result).to.have.property('intervalString', '10m');
  });

  it('returns overriden buckets (1d)', () => {
    const result = getBucketSize(req, '1d');
    expect(result).to.have.property('bucketSize', 86400);
    expect(result).to.have.property('intervalString', '1d');
  });

});
