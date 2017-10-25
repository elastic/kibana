import React from 'react';
import PropTypes from 'prop-types';
import {
  KuiTabs,
  KuiTab
} from 'ui_framework/components';

export class Tutorial extends React.Component {

  constructor(props) {
    super(props);

    this.tabs = props.tutorial.instructionPlatforms.map((platform) => {
      return {
        id: platform.id
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
    return this.tabs.map((tab,index) => (
      <KuiTab
        onClick={() => this.onSelectedTabChanged(tab.id)}
        isSelected={tab.id === this.state.selectedTabId}
        key={index}
      >
        {tab.id}
      </KuiTab>
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

          <KuiTabs>
            {this.renderTabs()}
          </KuiTabs>
        </div>
      </div>
    );
  }
}

Tutorial.propTypes = {
  tutorial: PropTypes.object.isRequired
};
