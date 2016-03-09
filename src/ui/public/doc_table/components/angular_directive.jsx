import React, { Component, PropTypes } from 'react';
import { assign } from 'lodash';
import angular from 'angular';

export default class AngularDirective extends Component {
  static propTypes = {
    children: PropTypes.node,
    scope: PropTypes.object
  };

  static contextTypes = {
    $scope: PropTypes.object,
    $injector: PropTypes.object,
  };

  componentDidMount() {
    this.bindScope();
  }

  componentWillReceiveProps(nextProps) {
    assign(this.$scope, nextProps.scope);
    this.$scope.$digest();
  }

  shouldComponentUpdate(nextProps) {
    return !this.$scope || (nextProps.children !== this.props.children);
  }

  componentDidUpdate() {
    this.bindScope();
  }

  componentWillUnmount() {
    this.cleanupScope();
  }

  bindScope() {
    if (!this.context.$scope || !this.context.$injector) return;

    this.cleanupScope();
    this.$scope = this.context.$scope.$new();
    assign(this.$scope, this.props.scope);

    const $compile = this.context.$injector.get('$compile');
    $compile(this.refs.$ng)(this.$scope);
  }

  cleanupScope() {
    if (this.$scope) {
      this.$scope.$destroy();
      this.$scope = null;
    }
  }

  render() {
    return <div ref="$ng">{this.props.children}</div>;
  }
}
