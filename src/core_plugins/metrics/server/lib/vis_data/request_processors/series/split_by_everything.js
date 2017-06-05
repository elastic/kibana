import _ from 'lodash';
export default function splitByEverything(req, panel, series) {
  return next => doc => {
    if (series.split_mode === 'everything' ||
      (series.split_mode === 'terms' &&
        !series.terms_field)) {
      _.set(doc, `aggs.${series.id}.filter.match_all`, {});
    }
    return next(doc);
  };
}

