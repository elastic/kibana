import React from 'react';
import { expect } from 'chai';
import { shallow } from 'enzyme';
import sinon from 'sinon';
import addScope from '../add_scope';

const Component = React.createClass({
  render() {
    return (<div/>);
  }
});

describe('addScope()', () => {

  let unsubStub;
  let watchCollectionStub;
  let $scope;

  beforeEach(() => {
    unsubStub = sinon.stub();
    watchCollectionStub = sinon.stub().returns(unsubStub);
    $scope = {
      $watchCollection: watchCollectionStub,
      testOne: 1,
      testTwo: 2
    };
  });

  it('adds $scope variables as props to wrapped component', () => {
    const WrappedComponent = addScope(Component, $scope, ['testOne', 'testTwo']);
    const wrapper = shallow(<WrappedComponent/>);
    expect(wrapper.state('testOne')).to.equal(1);
    expect(wrapper.state('testTwo')).to.equal(2);
  });

  it('calls $scope.$watchCollection on each scoped item', () => {
    const WrappedComponent = addScope(Component, $scope, ['testOne', 'testTwo']);
    shallow(<WrappedComponent/>);
    expect(watchCollectionStub.calledTwice).to.equal(true);
    expect(watchCollectionStub.firstCall.args[0]).to.equal('testOne');
    expect(watchCollectionStub.secondCall.args[0]).to.equal('testTwo');
  });

  it('unsubscribes from watches', () => {
    const WrappedComponent = addScope(Component, $scope, ['testOne', 'testTwo']);
    const wrapper = shallow(<WrappedComponent/>);
    wrapper.unmount();
    expect(unsubStub.calledTwice).to.equal(true);
  });

  it('updates state when watch is called', () => {
    const WrappedComponent = addScope(Component, $scope, ['testOne']);
    const wrapper = shallow(<WrappedComponent/>);
    watchCollectionStub.firstCall.args[1].call(null, 3);
    expect(wrapper.state('testOne')).to.equal(3);
  });

});
