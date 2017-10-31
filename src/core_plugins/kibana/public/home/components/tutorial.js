import React from 'react';
import PropTypes from 'prop-types';
import { InstructionSet } from './instruction_set';

export class Tutorial extends React.Component {

  constructor(props) {
    super(props);
  }

  renderInstructionSets = () => {
    return this.props.tutorial.instructionSets.map((instructionSet, index) => (
      <InstructionSet
        instructionSet={instructionSet}
        key={index}
      />
    ));
  }

  render() {
    return (
      <div className="kuiView">
        <div className="kuiViewContent kuiViewContent--constrainedWidth">

          <h2 className="kuiTitle">
            {this.props.tutorial.name}
          </h2>

          <p className="kuiText kuiSubduedText kuiVerticalRhythm kuiVerticalRhythmSmall">
            {this.props.tutorial.longDescription}
          </p>

          {this.renderInstructionSets()}
        </div>
      </div>
    );
  }
}

Tutorial.propTypes = {
  tutorial: PropTypes.object.isRequired
};
