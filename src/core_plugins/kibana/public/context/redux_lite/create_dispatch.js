import _ from 'lodash';

import { failed, started } from './action_creator_helpers';


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


export {
  createDispatchProvider,
};
