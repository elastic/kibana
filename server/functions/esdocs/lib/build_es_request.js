import { addFilter } from './add_filter';

export function buildESRequest(esRequest, canvasQuery) {

  if (canvasQuery.sort) {
    // TODO: Figure out sort object shape and behavior
    //console.log(canvasQuery.sort);
  }

  if (canvasQuery.size) {
    esRequest = Object.assign({}, esRequest, { size: canvasQuery.size });
  }

  if (canvasQuery.and) {
    canvasQuery.and.forEach(clause => {
      if (clause.type !== 'filter') throw new Error('Only filter type clauses are supported right now');
      addFilter(esRequest.body.query.bool.must, clause.value);
    });
  }

  return esRequest;

}
