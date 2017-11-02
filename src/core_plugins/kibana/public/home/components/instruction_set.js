import React from 'react';
import PropTypes from 'prop-types';
import {
  KuiTabs,
  KuiTab
} from 'ui_framework/components';
import { getDisplayText } from '../instruction_variant';

export class InstructionSet extends React.Component {

  constructor(props) {
    super(props);

    this.tabs = props.instructionSet.instructionVariants.map((variant) => {
      return {
        id: variant.id,
        name: getDisplayText(variant.id)
      };
    });

    if (this.tabs.length > 0) {
      this.state = {
        selectedTabId: this.tabs[0].id
      };
    }
  }

  onSelectedTabChanged = id => {
    this.setState({
      selectedTabId: id,
    });
  };

  renderTabs = () => {
    return this.tabs.map((tab, index) => (
      <KuiTab
        onClick={() => this.onSelectedTabChanged(tab.id)}
        isSelected={tab.id === this.state.selectedTabId}
        key={index}
      >
        {tab.name}
      </KuiTab>
    ));
  }

  render() {
    let title;
    if (this.props.instructionSet.title) {
      title = (
        <h2 className="kuiTitle">
          {this.props.instructionSet.title}
        </h2>
      );
    }

    return (
      <div>
        {title}

        <KuiTabs>
          {this.renderTabs()}
        </KuiTabs>

      </div>
    );
  }
}

InstructionSet.propTypes = {
  instructionSet: PropTypes.object.isRequired
};
