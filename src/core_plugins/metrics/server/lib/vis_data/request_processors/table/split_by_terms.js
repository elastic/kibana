import { overwrite } from '../../helpers'

export default function splitByTerm(req, panel) {
  return next => doc => {
    panel.series.filter(c => c.aggregate_by && c.aggregate_function).forEach(column => {
      overwrite(doc, `aggs.pivot.aggs.${column.id}.terms.field`, column.aggregate_by);
      overwrite(doc, `aggs.pivot.aggs.${column.id}.terms.size`, 100);
      if (column.filter) {
        overwrite(doc, `aggs.pivot.aggs.${column.id}.column_filter.filter.query_string.query`, column.filter);
        overwrite(doc, `aggs.pivot.aggs.${column.id}.column_filter.filter.query_string.analyze_wildcard`, true);
      }
    });
    return next(doc);
  };
}


