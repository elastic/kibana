import { expect } from 'chai';
import calculateLabel from '../calculate_label';

describe('calculateLabel(metric, metrics)', () => {
  it('returns "Unkonwn" for empty metric', () => {
    expect(calculateLabel()).to.equal('Unknown');
  });

  it('returns the metric.alias if set', () => {
    expect(calculateLabel({ alias: 'Example' })).to.equal('Example');
  });

  it('returns "Count" for a count metric', () => {
    expect(calculateLabel({ type: 'count' })).to.equal('Count');
  });

  it('returns "Calcuation" for a bucket script metric', () => {
    expect(calculateLabel({ type: 'calculation' })).to.equal('Calculation');
  });

  it('returns formated label for series_agg', () => {
    const label = calculateLabel({ type: 'series_agg', function: 'max' });
    expect(label).to.equal('Series Agg (max)');
  });

  it('returns formated label for basic aggs', () => {
    const label = calculateLabel({ type: 'avg', field: 'memory' });
    expect(label).to.equal('Average of memory');
  });

  it('returns formated label for pipeline aggs', () => {
    const metric = { id: 2, type: 'derivative', field: 1 };
    const metrics = [
      { id: 1, type: 'max', field: 'network.out.bytes' },
      metric
    ];
    const label = calculateLabel(metric, metrics);
    expect(label).to.equal('Derivative of Max of network.out.bytes');
  });

  it('returns formated label for pipeline aggs (deep)', () => {
    const metric = { id: 3, type: 'derivative', field: 2 };
    const metrics = [
      { id: 1, type: 'max', field: 'network.out.bytes' },
      { id: 2, type: 'moving_average', field: 1 },
      metric
    ];
    const label = calculateLabel(metric, metrics);
    expect(label).to.equal('Derivative of Moving Average of Max of network.out.bytes');
  });

  it('returns formated label for pipeline aggs uses alias for field metric', () => {
    const metric = { id: 2, type: 'derivative', field: 1 };
    const metrics = [
      { id: 1, type: 'max', field: 'network.out.bytes', alias: 'Outbound Traffic' },
      metric
    ];
    const label = calculateLabel(metric, metrics);
    expect(label).to.equal('Derivative of Outbound Traffic');
  });

});
