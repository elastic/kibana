import calculateSiblings from '../calculate_siblings';
import { expect } from 'chai';

describe('calculateSiblings(metrics, metric)', () => {
  it('should return all siblings', () => {
    const metrics = [
      { id: 1, type: 'max', field: 'network.bytes' },
      { id: 2, type: 'derivative', field: 1 },
      { id: 3, type: 'derivative', field: 2 },
      { id: 4, type: 'moving_average', field: 2 },
      { id: 5, type: 'count' }
    ];
    const siblings = calculateSiblings(metrics, { id: 2 });
    expect(siblings).to.eql([
      { id: 1, type: 'max', field: 'network.bytes' },
      { id: 5, type: 'count' }
    ]);
  });
});
