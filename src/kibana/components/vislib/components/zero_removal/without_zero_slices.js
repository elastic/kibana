define(function (require) {
  return function WithoutZeroSlicesUtilService() {
    var _ = require('lodash');

    return function withoutZeroSlices(slices) {
      if (!slices.children) return slices;

      slices = _.clone(slices);
      slices.children = slices.children.reduce(function (children, child) {
        if (child.size !== 0) {
          children.push(withoutZeroSlices(child));
        }
        return children;
      }, []);
      return slices;
    };
  };
});
