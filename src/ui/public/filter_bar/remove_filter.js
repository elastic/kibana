import _ from 'lodash';

export default function () {

  return function ($state, $scope) {
    if (!_.isObject($state)) throw new Error('pushFilters requires a state object');
    return function (filterId) {
      // Hierarchical and tabular data set their aggConfigResult parameter
      // differently because of how the point is rewritten between the two. So
      // we need to check if the point.orig is set, if not use try the point.aggConfigResult
      const filters = _.clone($state.filters || []);
      let position = -1;
      if (filterId) {
        filters.forEach((filter, ind) => {
          if (filterId === filter.meta._id) {
            position = ind;
          }
        });

        if (position > -1) {
          // const pendingFilter = {meta: {negate: negate, index: index, _id: filterId}};
          console.log('remove  the filter');
          filters.splice(position, 1);

          $state.filters = filters;
          return true;
        }
      }

      return false;
    };
  };
}
