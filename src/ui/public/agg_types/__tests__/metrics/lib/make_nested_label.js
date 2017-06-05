import expect from 'expect.js';
import { makeNestedLabel } from 'ui/agg_types/metrics/lib/make_nested_label';

describe('metric agg make_nested_label', function () {

  function generateAggConfig(metricLabel) {
    return {
      params: {
        customMetric: {
          makeLabel: () => { return metricLabel; }
        }
      }
    };
  }

  it('should return a metric label with prefix', function () {
    const aggConfig = generateAggConfig('Count');
    const label = makeNestedLabel(aggConfig, 'derivative');
    expect(label).to.eql('Derivative of Count');
  });

  it('should return a numbered prefix', function () {
    const aggConfig = generateAggConfig('Derivative of Count');
    const label = makeNestedLabel(aggConfig, 'derivative');
    expect(label).to.eql('2. derivative of Count');
  });

  it('should return a prefix with correct order', function () {
    const aggConfig = generateAggConfig('3. derivative of Count');
    const label = makeNestedLabel(aggConfig, 'derivative');
    expect(label).to.eql('4. derivative of Count');
  });

});
