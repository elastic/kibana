export function queryDatatable(datatable, query) {
  if (query.size) {
    datatable = {
      ...datatable,
      rows: datatable.rows.slice(0, query.size),
    };
  }

  if (query.and) {
    // Todo: figure out type of filters
    query.and.forEach((/*clause*/) => {
      //console.log(clause);
    });
  }

  return datatable;
}
