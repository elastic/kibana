import _ from 'lodash';
export default function splitByFilter(req, panel, series) {
  return next => doc => {
    if (series.split_mode === 'filters' && series.split_filters) {
      series.split_filters.forEach(filter => {
        _.set(doc, `aggs.${series.id}.filters.filters.${filter.id}.query_string.query`, filter.filter || '*');
        _.set(doc, `aggs.${series.id}.filters.filters.${filter.id}.query_string.analyze_wildcard`, true);
      });
    }
    return next(doc);
  };
}

