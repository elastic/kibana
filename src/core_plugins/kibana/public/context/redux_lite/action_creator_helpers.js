import _ from 'lodash';


function bindActionCreators(actionCreators, dispatch) {
  return _.mapValues(actionCreators, (actionCreator) => (
    _.flow(actionCreator, dispatch)
  ));
}

function failed(type) {
  return `${type}:failed`;
}

function started(type) {
  return `${type}:started`;
}


export {
  bindActionCreators,
  failed,
  started,
};
