import _ from 'lodash';

export default function () {
  return function ($state) {
    if (!_.isObject($state)) throw new Error('pushFilters requires a state object');
    return function (filter, negate, index) {
      // Hierarchical and tabular data set their aggConfigResult parameter
      // differently because of how the point is rewritten between the two. So
      // we need to check if the point.orig is set, if not use try the point.aggConfigResult
      const filters = _.clone($state.filters || []);
      const pendingFilter = { meta: { negate: negate, index: index }};
      _.assign(pendingFilter, filter);
      const filterKey = _.keys(filter)[0];
      let filterAdded = false;

      filters.forEach(function (filt) {
        const isDisabled = filt.meta && filt.meta.disabled;
        const isSameFilterType = filt.hasOwnProperty(filterKey);
        const isSameIndex = filt.meta && (filt.meta.index === index);
        if (!isDisabled && isSameFilterType && isSameIndex) {
          _.assign(pendingFilter.meta, filt.meta); // be sure to keep any meta data
          _.assign(filt, pendingFilter);
          filterAdded = true;
        }
      });

      if (!filterAdded) {
        filters.push(pendingFilter);
      }

      $state.filters = filters;
    };
  };
};
