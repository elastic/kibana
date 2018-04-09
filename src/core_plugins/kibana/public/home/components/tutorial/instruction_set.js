import classNames from 'classnames';
import React from 'react';
import PropTypes from 'prop-types';
import {
  KuiBar,
  KuiBarSection,
} from '@kbn/ui-framework/components';
import { Instruction } from './instruction';
import { ParameterForm } from './parameter_form';
import { getDisplayText } from '../../../../common/tutorials/instruction_variant';
import {
  EuiTabs,
  EuiTab,
  EuiSpacer,
  EuiSteps,
} from '@elastic/eui';

export class InstructionSet extends React.Component {

  constructor(props) {
    super(props);

    this.tabs = props.instructionVariants.map((variant) => {
      return {
        id: variant.id,
        name: getDisplayText(variant.id)
      };
    });

    this.state = {
      isParamFormVisible: false
    };

    if (this.tabs.length > 0) {
      this.state.selectedTabId = this.tabs[0].id;
    }
  }

  handleToggleVisibility = () => {
    this.setState(prevState => (
      {  isParamFormVisible: !prevState.isParamFormVisible }
    ));
  }

  onSelectedTabChanged = id => {
    this.setState({
      selectedTabId: id,
    });
  };

  renderTabs = () => {
    return this.tabs.map((tab, index) => (
      <EuiTab
        onClick={() => this.onSelectedTabChanged(tab.id)}
        isSelected={tab.id === this.state.selectedTabId}
        key={index}
      >
        {tab.name}
      </EuiTab>
    ));
  }

  renderInstructions = () => {
    const instructionVariant = this.props.instructionVariants.find(variant => {
      return variant.id === this.state.selectedTabId;
    });
    if (!instructionVariant) {
      return;
    }

    const steps = instructionVariant.instructions.map((instruction, index) => {
      const step = (
        <Instruction
          commands={instruction.commands}
          paramValues={this.props.paramValues}
          textPre={instruction.textPre}
          textPost={instruction.textPost}
          replaceTemplateStrings={this.props.replaceTemplateStrings}
        />
      );
      return {
        title: instruction.title,
        children: step,
        key: index
      };
    });

    return (
      <EuiSteps
        steps={steps}
        firstStepNumber={this.props.offset}
      />
    );
  }

  renderHeader = () => {
    let paramsVisibilityToggle;
    if (this.props.params) {
      const visibilityToggleClasses = classNames('kuiIcon kuiSideBarCollapsibleTitle__caret', {
        'fa-caret-right': !this.state.isParamFormVisible,
        'fa-caret-down': this.state.isParamFormVisible
      });
      paramsVisibilityToggle = (
        <div className="kuiSideBarCollapsibleTitle" style={{ cursor: 'pointer' }}>
          <div
            aria-label="toggle command parameters visibility"
            className="kuiSideBarCollapsibleTitle__label"
            onClick={this.handleToggleVisibility}
          >
            <span className={visibilityToggleClasses} />
            <span className="kuiSideBarCollapsibleTitle__text">
              Customize your code snippets
            </span>
          </div>
        </div>
      );
    }

    return (
      <KuiBar className="kuiVerticalRhythm">
        <KuiBarSection>
          <div className="kuiTitle">
            {this.props.title}
          </div>
        </KuiBarSection>

        <KuiBarSection>
          {paramsVisibilityToggle}
        </KuiBarSection>
      </KuiBar>
    );
  }

  render() {
    let paramsForm;
    if (this.props.params && this.state.isParamFormVisible) {
      paramsForm = (
        <ParameterForm
          params={this.props.params}
          paramValues={this.props.paramValues}
          setParameter={this.props.setParameter}
        />
      );
    }

    return (
      <div className="kuiVerticalRhythmLarge">

        {this.renderHeader()}

        {paramsForm}

        <EuiTabs className="kuiVerticalRhythm">
          {this.renderTabs()}
        </EuiTabs>

        <EuiSpacer size="m" />

        {this.renderInstructions()}

      </div>
    );
  }
}

const instructionShape = PropTypes.shape({
  title: PropTypes.string,
  textPre: PropTypes.string,
  commands: PropTypes.arrayOf(PropTypes.string),
  textPost: PropTypes.string
});

const instructionVariantShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  instructions: PropTypes.arrayOf(instructionShape).isRequired,
});

InstructionSet.propTypes = {
  title: PropTypes.string.isRequired,
  instructionVariants: PropTypes.arrayOf(instructionVariantShape).isRequired,
  offset: PropTypes.number.isRequired,
  params: PropTypes.array,
  paramValues: PropTypes.object.isRequired,
  setParameter: PropTypes.func,
  replaceTemplateStrings: PropTypes.func.isRequired,
};
