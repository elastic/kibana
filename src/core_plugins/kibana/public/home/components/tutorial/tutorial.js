import './tutorial.less';
import React from 'react';
import PropTypes from 'prop-types';
import { Introduction } from './introduction';
import { InstructionSet } from './instruction_set';

export class Tutorial extends React.Component {

  constructor(props) {
    super(props);
  }

  renderInstructionSets = () => {
    let offset = 1;
    return this.props.tutorial.instructionSets.map((instructionSet, index) => {
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
    return (
      <div className="kuiView home">
        <div className="kuiViewContent kuiViewContent--constrainedWidth">

          <Introduction
            title={this.props.tutorial.name}
            description={this.props.tutorial.longDescription}
          />

          <div className="homePanel">
            {this.renderInstructionSets()}
          </div>
        </div>
      </div>
    );
  }
}

Tutorial.propTypes = {
  tutorial: PropTypes.object.isRequired
};
