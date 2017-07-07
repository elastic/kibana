import React from 'react';
export default function addScope(WrappedComponent, $scope, addToState = []) {
  return React.createClass({

    getInitialState() {
      const state = {};
      addToState.forEach(key => {
        state[key] = $scope[key];
      });
      return state;
    },

    componentWillMount() {
      this.unsubs = addToState.map(key => {
        return $scope.$watchCollection(key, newValue => {
          const newState = {};
          newState[key] = newValue;
          this.setState(newState);
        });
      });
    },

    componentWillUnmount() {
      this.unsubs.forEach(fn => fn());
    },

    render() {
      return (
        <WrappedComponent {...this.state} {...this.props}/>
      );
    }
  });
}
