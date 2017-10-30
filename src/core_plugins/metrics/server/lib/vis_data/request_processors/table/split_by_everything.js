import _ from 'lodash';
export default function splitByEverything(req, panel) {
  return next => doc => {
    panel.series.filter(c => !(c.aggregate_by && c.aggregate_function)).forEach(column => {
      if (column.filter) {
        _.set(doc, `aggs.pivot.aggs.${column.id}.filter.query_string.query`, column.filter);
        _.set(doc, `aggs.pivot.aggs.${column.id}.filter.query_string.analyze_wildcard`, true);
      } else {
        _.set(doc, `aggs.pivot.aggs.${column.id}.filter.match_all`, {});
      }
    });
    return next(doc);
  };
}

