import { Component } from 'react';

export class TabProps extends Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedTab: props.selectedTab,
    };
  }

  changeTab = tab => this.setState({ selectedTab: tab })

  render() {
    const { selectedTab } = this.state;
    return this.props.render({
      selectedTab,
      changeTab: this.changeTab,
    });
  }
}
