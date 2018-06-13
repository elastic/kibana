import { getESFilter } from './get_es_filter';

const compact = arr => (Array.isArray(arr) ? arr.filter(val => Boolean(val)) : []);

export function buildBoolArray(canvasQueryFilterArray) {
  return compact(
    canvasQueryFilterArray.map(clause => {
      try {
        return getESFilter(clause);
      } catch (e) {
        return;
      }
    })
  );
}
