define(function (require) {
  return function PointSeriesGetAspects(Private) {
    let _ = require('lodash');
    let fakeXAspect = Private(require('ui/agg_response/point_series/_fake_x_aspect'));

    let map = {
      segment: 'x',
      metric: 'y',
      radius: 'z',
      width: 'width',
      group: 'series'
    };

    function columnToAspect(aspects, col, i) {
      let schema = col.aggConfig.schema.name;

      let name = map[schema];
      if (!name) throw new TypeError('unknown schema name "' + schema + '"');

      let aspect = {
        i: i,
        col: col,
        agg: col.aggConfig
      };

      if (!aspects[name]) aspects[name] = [];
      aspects[name].push(aspect);
    }

    /**
     * Identify and group the columns based on the aspect of the pointSeries
     * they represent.
     *
     * @param  {array} columns - the list of columns
     * @return {object} - an object with a key for each aspect (see map). The values
     *                    may be undefined, a single aspect, or an array of aspects.
     */
    return function getAspects(vis, table) {
      let aspects = _(table.columns)
      // write each column into the aspects under it's group
      .transform(columnToAspect, {})
      // unwrap groups that only have one value, and validate groups that have more
      .transform(function (aspects, group, name) {
        if (name !== 'y' && group.length > 1) {
          throw new TypeError('Only multiple metrics are supported in point series');
        }

        aspects[name] = group.length > 1 ? group : group[0];
      })
      .value();

      if (!aspects.x) {
        aspects.x = fakeXAspect(vis);
      }

      return aspects;
    };
  };
});
