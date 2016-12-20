import _ from 'lodash';


function createDispatchProvider($q) {
  return function createDispatch(getState, setState, reducer) {
    const dispatchWithMiddleware = _.compose(
      createThunkMiddleware,
      createPromiseMiddleware,
    )(dispatch);

    return dispatchWithMiddleware;

    function dispatch(action) {
      const nextState = reducer(getState(), action);
      setState(nextState);

      return action;
    }

    function createThunkMiddleware(next) {
      return (action) => {
        if (_.isFunction(action)) {
          return action(dispatchWithMiddleware, getState);
        }

        return next(action);
      };
    }

    function createPromiseMiddleware(next) {
      return (action) => {
        if (_.isFunction(_.get(action, ['payload', 'then']))) {
          next({ type: started(action.type) });

          return $q.resolve(action.payload)
            .then(
              (result) => dispatchWithMiddleware({ type: action.type, payload: result }),
              (error) => dispatchWithMiddleware({ type: failed(action.type), payload: error, error: true }),
            );
        }

        return next(action);
      };
    }

  };
}

function createReducerPipeline(...updaters) {
  return (state, action) => (
    _.flow(...updaters.map((updater) => (state) => updater(state, action)))(state)
  );
}

function bindActionCreators(actionCreators, dispatch) {
  return _.mapValues(actionCreators, (actionCreator) => (
    _.flow(actionCreator, dispatch)
  ));
}

function scopeReducer(key, reducer) {
  return (state, action) => {
    const subState = state[key];
    const newSubState = reducer(subState, action);

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
  createReducerPipeline,
  scopeReducer,
  createSelector,
  failed,
  started,
};
