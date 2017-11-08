import './tutorial.less';
import React from 'react';
import PropTypes from 'prop-types';
import { Introduction } from './introduction';
import { InstructionSet } from './instruction_set';
import { getTutorial } from '../../tutorials';

export class Tutorial extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      notFound: false,
      tutorial: null
    };
  }

  async componentWillMount() {
    const tutorial = await getTutorial(this.props.tutorialId);
    if (tutorial) {
      this.setState({
        tutorial: tutorial,
      });
    } else {
      this.setState({
        notFound: true,
      });
    }
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
      content = (
        <div>
          <Introduction
            title={this.state.tutorial.name}
            description={this.state.tutorial.longDescription}
          />

          <div className="homePanel">
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
  tutorialId: PropTypes.string.isRequired
};
