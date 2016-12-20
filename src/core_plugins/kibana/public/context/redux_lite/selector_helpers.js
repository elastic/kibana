import _ from 'lodash';


function createSelector(dependencies, selector) {
  let previousDependencies = [];
  let previousResult = null;

  return (...args) => {
    const currentDependencies = dependencies.map((dependency) => dependency(...args));

    if (_.any(_.zipWith(previousDependencies, currentDependencies, (first, second) => first !== second))) {
      previousDependencies = currentDependencies;
      previousResult = selector(...previousDependencies);
    }

    return previousResult;
  };
}


export {
  createSelector,
};
