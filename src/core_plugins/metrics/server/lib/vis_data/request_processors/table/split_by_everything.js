import { overwrite } from '../../helpers'
export default function splitByEverything(req, panel) {
  return next => doc => {
    panel.series.filter(c => !(c.aggregate_by && c.aggregate_function)).forEach(column => {
      if (column.filter) {
        overwrite(doc, `aggs.pivot.aggs.${column.id}.filter.query_string.query`, column.filter);
        overwrite(doc, `aggs.pivot.aggs.${column.id}.filter.query_string.analyze_wildcard`, true);
      } else {
        overwrite(doc, `aggs.pivot.aggs.${column.id}.filter.match_all`, {});
      }
    });
    return next(doc);
  };
}

