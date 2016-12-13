import _ from 'lodash';


function createDispatchProvider($q) {
  return function createDispatch(getState, setState, update) {
    const dispatchWithProcessors = _.compose(
      createThunkProcessor,
      createPromiseProcessor,
    )(dispatch);

    return dispatchWithProcessors;

    function dispatch(action) {
      const nextState = update(getState(), action);
      setState(nextState);

      return action;
    }

    function createThunkProcessor(next) {
      return (action) => {
        if (_.isFunction(action)) {
          return action(dispatchWithProcessors, getState);
        }

        return next(action);
      };
    }

    function createPromiseProcessor(next) {
      return (action) => {
        if (_.isFunction(_.get(action, ['payload', 'then']))) {
          next({ type: started(action.type) });

          return $q.resolve(action.payload)
            .then(
              (result) => dispatchWithProcessors({ type: action.type, payload: result }),
              (error) => dispatchWithProcessors({ type: failed(action.type), payload: error, error: true }),
            );
        }

        return next(action);
      };
    }

  };
}

function createPipeline(...updaters) {
  return (state, action) => (
    _.flow(...updaters.map((updater) => (state) => updater(state, action)))(state)
  );
}

function bindActionCreators(actionCreators, dispatch) {
  return _.mapValues(actionCreators, (actionCreator) => (
    _.flow(actionCreator, dispatch)
  ));
}

function createScopedUpdater(key, updater) {
  return (state, action) => {
    const subState = state[key];
    const newSubState = updater(subState, action);

    if (subState !== newSubState) {
      return { ...state, [key] : newSubState };
    }

    return state;
  };
}

function started(type) {
  return `${type}:started`;
}

function failed(type) {
  return `${type}:failed`;
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
  bindActionCreators,
  createDispatchProvider,
  createPipeline,
  createScopedUpdater,
  createSelector,
  failed,
  started,
};
