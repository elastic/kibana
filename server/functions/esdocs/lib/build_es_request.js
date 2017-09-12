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
      addFilter(esRequest.body.query.bool.must, clause);
    });
  }

  return esRequest;

}
