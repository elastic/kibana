import { uniq } from 'lodash';
export function extractIndexPatterns(vis) {
  const patternsToFetch = [];

  if (!vis.fields[vis.params.index_pattern]) {
    patternsToFetch.push(vis.params.index_pattern);
  }

  vis.params.series.forEach(series => {
    const indexPattern = series.series_index_pattern;
    if (series.override_index_pattern && !vis.fields[indexPattern]) {
      patternsToFetch.push(indexPattern);
    }
  });

  if (vis.params.annotations) {
    vis.params.annotations.forEach(item => {
      const indexPattern = item.index_pattern;
      if (indexPattern && !vis.fields[indexPattern]) {
        patternsToFetch.push(indexPattern);
      }
    });
  }

  return uniq(patternsToFetch);

}
