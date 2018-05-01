import { MetricsCollector } from './';

const { sumAccumulate } = MetricsCollector;

describe('Accumulate By Summing Metrics', function () {
  it('should accumulate empty object with nothing as nothing', () => {
    const accum = { blues: {} };
    const current = sumAccumulate('blues', accum, {});
    expect(current).toEqual(undefined);
  });

  it('should return data to merge with initial empty data', () => {
    let accum = { blues: {} };
    const next = { blues: { total: 1 } };
    const accumulated = sumAccumulate('blues', accum, next);
    accum = { ...accum, blues: accumulated };
    expect(accum).toEqual({ blues: { total: 1 } });
  });

  it('should return data to merge with already accumulated data', () => {
    let currentProp;
    let accumulated;

    // initial
    let accum = {
      reds: 1,
      oranges: { total: 2 },
      yellows: { total: 3 },
      greens: { total: 4 },
      blues: { dislikes: 2, likes: 3, total: 5 },
      indigos: { total: 6 },
      violets: { total: 7 },
    };

    // first accumulation - existing nested object
    currentProp = 'blues';
    accumulated = sumAccumulate(currentProp, accum, {
      [currentProp]: { likes: 2, total: 2 },
    });
    accum = { ...accum, [currentProp]: accumulated };
    expect(accum).toEqual({
      reds: 1,
      oranges: { total: 2 },
      yellows: { total: 3 },
      greens: { total: 4 },
      blues: { dislikes: 2, likes: 5, total: 7 },
      indigos: { total: 6 },
      violets: { total: 7 },
    });

    // second accumulation - existing non-nested object
    currentProp = 'reds';
    accumulated = sumAccumulate(currentProp, accum, { [currentProp]: 2 });
    accum = { ...accum, [currentProp]: accumulated };
    expect(accum).toEqual({
      reds: 3,
      oranges: { total: 2 },
      yellows: { total: 3 },
      greens: { total: 4 },
      blues: { dislikes: 2, likes: 5, total: 7 },
      indigos: { total: 6 },
      violets: { total: 7 },
    });

    // third accumulation - new nested object prop
    currentProp = 'ultraviolets';
    accumulated = sumAccumulate(currentProp, accum, {
      [currentProp]: { total: 1, likes: 1, dislikes: 0 },
    });
    accum = { ...accum, [currentProp]: accumulated };
    expect(accum).toEqual({
      reds: 3,
      oranges: { total: 2 },
      yellows: { total: 3 },
      greens: { total: 4 },
      blues: { dislikes: 2, likes: 5, total: 7 },
      indigos: { total: 6 },
      violets: { total: 7 },
      ultraviolets: { dislikes: 0, likes: 1, total: 1 },
    });
  });
});
