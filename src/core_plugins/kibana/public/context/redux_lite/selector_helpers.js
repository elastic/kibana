import _ from 'lodash';


function bindAngularGetterSetters(getterSetters, getState) {
  return _.mapValues(getterSetters, ([actionCreator, selector]) => (value) =>
    _.isUndefined(value) ? selector(getState()) : actionCreator(value)
  );
}

function bindSelectors(selectors, getState) {
  return _.mapValues(selectors, (selector) => () =>
    selector(getState())
  );
}

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
  bindAngularGetterSetters,
  bindSelectors,
  createSelector,
};
