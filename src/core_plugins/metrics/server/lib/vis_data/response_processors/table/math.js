import { mathAgg } from '../series/math';

export function math(bucket, panel, series) {
  return next => results => {
    const mathFn = mathAgg({ aggregations: bucket }, panel, series);
    return mathFn(next)(results);
  };
}
