import _ from 'lodash';
export default function splitByFilter(req, panel, series) {
  return next => doc => {
    if (series.split_mode !== 'filter') return next(doc);
    _.set(doc, `aggs.${series.id}.filter.query_string.query`, series.filter || '*');
    _.set(doc, `aggs.${series.id}.filter.query_string.analyze_wildcard`, true);
    return next(doc);
  };
}
