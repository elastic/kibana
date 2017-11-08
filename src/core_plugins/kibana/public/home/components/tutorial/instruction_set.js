import React from 'react';
import PropTypes from 'prop-types';
import {
  KuiTabs,
  KuiTab
} from 'ui_framework/components';
import { Instruction } from './instruction';
import { Step } from './step';
import { getDisplayText } from '../../../../common/tutorials/instruction_variant';

export class InstructionSet extends React.Component {

  constructor(props) {
    super(props);

    this.tabs = props.instructionVariants.map((variant) => {
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

  renderInstructions = () => {
    const instructionVariant = this.props.instructionVariants.find(variant => {
      return variant.id === this.state.selectedTabId;
    });
    if (!instructionVariant) {
      return;
    }

    return instructionVariant.instructions.map((instruction, index) => (
      <Step
        className="kuiVerticalRhythm"
        key={index}
        step={this.props.offset + index}
        title={instruction.title}
      >
        <Instruction
          commands={instruction.commands}
          textPre={instruction.textPre}
          textPost={instruction.textPost}
        />
      </Step>
    ));
  }

  render() {
    let title;
    if (this.props.title) {
      title = (
        <h1 className="kuiTitle kuiVerticalRhythm">
          {this.props.title}
        </h1>
      );
    }

    return (
      <div className="kuiVerticalRhythmLarge">
        {title}

        <KuiTabs className="kuiVerticalRhythm">
          {this.renderTabs()}
        </KuiTabs>

        {this.renderInstructions()}

      </div>
    );
  }
}

InstructionSet.propTypes = {
  title: PropTypes.string.isRequired,
  instructionVariants: PropTypes.array.isRequired,
  offset: PropTypes.number.isRequired
};
