import { overwrite } from '../../helpers'
export default function splitByFilter(req, panel, series) {
  return next => doc => {
    if (series.split_mode !== 'filter') return next(doc);
    overwrite(doc, `aggs.${series.id}.filter.query_string.query`, series.filter || '*');
    overwrite(doc, `aggs.${series.id}.filter.query_string.analyze_wildcard`, true);
    return next(doc);
  };
}
