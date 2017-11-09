import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { Introduction } from './introduction';
import { InstructionSet } from './instruction_set';
import { ParameterForm } from './parameter_form';
import { getTutorial } from '../../tutorials';

export class Tutorial extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      notFound: false,
      paramValues: {},
      tutorial: null
    };
  }

  async componentWillMount() {
    const tutorial = await getTutorial(this.props.tutorialId);
    if (tutorial) {
      const paramValues = {};
      if (tutorial.params) {
        tutorial.params.forEach((param => {
          paramValues[param.id] = param.defaultValue;
        }));
      }
      this.setState({
        paramValues: paramValues,
        tutorial: tutorial
      });
    } else {
      this.setState({
        notFound: true,
      });
    }
  }

  setParameter = (paramId, newValue) => {
    this.setState(previousState => {
      const paramValues = _.cloneDeep(previousState.paramValues);
      paramValues[paramId] = newValue;
      return { paramValues: paramValues };
    });
  }

  renderInstructionSets = () => {
    let offset = 1;
    return this.state.tutorial.instructionSets.map((instructionSet, index) => {
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
      if (this.state.tutorial.params) {
        params = (
          <ParameterForm
            params={this.state.tutorial.params}
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

          <div className="homePanel kuiVerticalRhythm">
            {params}
            {this.renderInstructionSets()}
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
  tutorialId: PropTypes.string.isRequired
};
