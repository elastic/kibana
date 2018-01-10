import { compact } from 'lodash';
import { getESFilter } from './get_es_filter';

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
