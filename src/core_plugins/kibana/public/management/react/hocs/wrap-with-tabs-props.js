import React, { Component } from 'react';

export const wrapWithTabsProps = ({ defaults }) => {
  return (BaseComponent) => class extends Component {
    constructor(props) {
      super(props);

      this.state = {
        selectedTab: defaults.selectedTab,
      };
    }

    changeTab = tab => this.setState({ selectedTab: tab })

    render() {
      const { selectedTab } = this.state;

      return <BaseComponent {...this.props} selectedTab={selectedTab} changeTab={this.changeTab}/>;
    }
  };
};
