import './tutorial.less';
import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { Introduction } from './introduction';
import { InstructionSet } from './instruction_set';
import { ParameterForm } from './parameter_form';
import { getTutorial } from '../../tutorials';
import {
  KuiButtonGroup,
  KuiButton
} from 'ui_framework/components';

const INSTRUCTIONS_TYPE = {
  ELASTIC_CLOUD: 'elasticCloud',
  ON_PREM: 'onPrem',
  ON_PREM_ELASTIC_CLOUD: 'onPremElasticCloud'
};

export class Tutorial extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      notFound: false,
      paramValues: {},
      tutorial: null
    };

    if (props.isCloudEnabled) {
      this.state.visibleInstructions = INSTRUCTIONS_TYPE.ELASTIC_CLOUD;
    } else {
      this.state.visibleInstructions = INSTRUCTIONS_TYPE.ON_PREM;
    }
  }

  async componentWillMount() {
    const tutorial = await getTutorial(this.props.tutorialId);
    if (tutorial) {
      this.setState({
        tutorial: tutorial
      }, this.setParamDefaults);
    } else {
      this.setState({
        notFound: true,
      });
    }
  }

  getInstructions = () => {
    if (!this.state.tutorial) {
      return { instructionSets: [] };
    }

    switch(this.state.visibleInstructions) {
      case INSTRUCTIONS_TYPE.ELASTIC_CLOUD:
        return this.state.tutorial.elasticCloud;
      case INSTRUCTIONS_TYPE.ON_PREM:
        return this.state.tutorial.onPrem;
      case INSTRUCTIONS_TYPE.ON_PREM_ELASTIC_CLOUD:
        return this.state.tutorial.onPremElasticCloud;
      default:
        throw new Error(`Unhandled instruction type ${this.state.visibleInstructions}`);
    }
  }

  setParamDefaults = () => {
    const instructions = this.getInstructions();
    const paramValues = {};
    if (instructions.params) {
      instructions.params.forEach((param => {
        paramValues[param.id] = param.defaultValue;
      }));
    }
    this.setState({
      paramValues: paramValues
    });
  }

  setVisibleInstructions = (instructionsType) => {
    this.setState({
      visibleInstructions: instructionsType
    }, this.setParamDefaults);
  }

  setParameter = (paramId, newValue) => {
    this.setState(previousState => {
      const paramValues = _.cloneDeep(previousState.paramValues);
      paramValues[paramId] = newValue;
      return { paramValues: paramValues };
    });
  }

  onPrem = () => {
    this.setVisibleInstructions(INSTRUCTIONS_TYPE.ON_PREM);
  }

  onPremElasticCloud = () => {
    this.setVisibleInstructions(INSTRUCTIONS_TYPE.ON_PREM_ELASTIC_CLOUD);
  }

  renderInstructionSetsToggle = () => {
    if (!this.props.isCloudEnabled) {
      return (
        <div>
          <KuiButtonGroup isUnited>
            <KuiButton buttonType="basic" onClick={this.onPrem}>
              On premise
            </KuiButton>

            <KuiButton buttonType="basic" onClick={this.onPremElasticCloud}>
              Elastic cloud
            </KuiButton>
          </KuiButtonGroup>
        </div>
      );
    }
  }

  renderInstructionSets = (instructions) => {
    let offset = 1;
    return instructions.instructionSets.map((instructionSet, index) => {
      const currentOffset = offset;
      offset += instructionSet.instructionVariants[0].instructions.length;
      return (
        <InstructionSet
          title={instructionSet.title}
          instructionVariants={instructionSet.instructionVariants}
          offset={currentOffset}
          paramValues={this.state.paramValues}
          key={index}
        />
      );
    });
  }

  render() {
    const instructions = this.getInstructions();
    let content;
    if (this.state.notFound) {
      content = (
        <div className="homePanel">
          <p className="kuiText kuiSubduedText kuiVerticalRhythm kuiVerticalRhythmSmall">
            Unable to find tutorial {this.props.tutorialId}
          </p>
        </div>
      );
    }
    if (this.state.tutorial) {
      let previewUrl;
      if (this.state.tutorial.previewImagePath) {
        previewUrl = this.props.addBasePath(this.state.tutorial.previewImagePath);
      }
      let params;
      if (instructions.params) {
        params = (
          <ParameterForm
            params={instructions.params}
            paramValues={this.state.paramValues}
            setParameter={this.setParameter}
          />
        );
      }
      content = (
        <div>
          <Introduction
            title={this.state.tutorial.name}
            description={this.state.tutorial.longDescription}
            previewUrl={previewUrl}
          />

          {this.renderInstructionSetsToggle()}

          <div className="homePanel kuiVerticalRhythm">
            {params}
            {this.renderInstructionSets(instructions)}
          </div>
        </div>
      );
    }
    return (
      <div className="kuiView home">
        <div className="kuiViewContent kuiViewContent--constrainedWidth">
          {content}
        </div>
      </div>
    );
  }
}

Tutorial.propTypes = {
  addBasePath: PropTypes.func.isRequired,
  isCloudEnabled: PropTypes.bool.isRequired,
  cloudId: PropTypes.string,
  tutorialId: PropTypes.string.isRequired
};
