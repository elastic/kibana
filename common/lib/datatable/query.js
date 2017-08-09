export function queryDatatable(datatable, query) {

  if (query.sort) {
    // TODO: Figure out sort object shape and behavior
    //console.log(query.sort);
  }

  if (query.size) {
    datatable = Object.assign({}, datatable, { rows: datatable.rows.slice(0, query.size) });
  }

  if (query.filters) {
    // Todo: figure out type of filters
    query.filters.each(clause => {
      console.log(clause);
    });
  }

  return datatable;

}
