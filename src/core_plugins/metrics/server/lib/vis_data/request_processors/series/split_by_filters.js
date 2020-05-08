import { overwrite } from '../../helpers';
export default function splitByFilter(req, panel, series) {
  return next => doc => {
    if (series.split_mode === 'filters' && series.split_filters) {
      series.split_filters.forEach(filter => {
        overwrite(doc, `aggs.${series.id}.filters.filters.${filter.id}.query_string.query`, filter.filter || '*');
        overwrite(doc, `aggs.${series.id}.filters.filters.${filter.id}.query_string.analyze_wildcard`, true);
      });
    }
    return next(doc);
  };
}

