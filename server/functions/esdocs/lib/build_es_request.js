export function buildESRequest(esRequest, canvasQuery) {

  if (canvasQuery.sort) {
    // TODO: Figure out sort object shape and behavior
    //console.log(canvasQuery.sort);
  }

  if (canvasQuery.size) {
    esRequest = Object.assign({}, esRequest, { size: canvasQuery.size });
  }

  if (canvasQuery.filters) {
    // Todo: figure out type of filters
    canvasQuery.filters.each(clause => {
      console.log(clause);
    });
  }

  return esRequest;

}
