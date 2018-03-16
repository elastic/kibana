import './radio_button_group.less';
import React from 'react';
import PropTypes from 'prop-types';
import {
  KuiButtonGroup,
  KuiButton
} from '@kbn/ui-framework/components';

export class RadioButtonGroup extends React.Component {

  constructor(props) {
    super(props);

    this.state = {};

    if (props.buttons.length > 0) {
      const matchingButton = props.buttons.find(button => {
        return props.selectedBtnLabel === button.label;
      });
      if (matchingButton) {
        this.state.selectedBtnLabel = props.selectedBtnLabel;
      } else {
        this.state.selectedBtnLabel = props.buttons[0].label;
      }
    }
  }

  renderButtons = () => {
    return this.props.buttons.map((button, index) => {
      const handleOnClick = () => {
        this.setState({
          selectedBtnLabel: button.label
        });
        button.onClick();
      };

      let buttonType = 'secondary';
      if (button.label === this.state.selectedBtnLabel) {
        buttonType = 'primary';
      }
      return (
        <KuiButton
          className="kuiRadioButton"
          buttonType={buttonType}
          onClick={handleOnClick}
          key={index}
          data-test-subj={button.dataTestSubj}
        >
          {button.label}
        </KuiButton>
      );
    });
  }

  render = () => {
    return (
      <KuiButtonGroup
        className="radioButtonGroup"
        isUnited
      >
        {this.renderButtons()}
      </KuiButtonGroup>
    );
  }
}

RadioButtonGroup.propTypes = {
  buttons: PropTypes.arrayOf(PropTypes.shape({
    onClick: PropTypes.func.isRequired,
    label: PropTypes.string.isRequired,
    dataTestSubj: PropTypes.string
  })).isRequired,
  selectedBtnLabel: PropTypes.string
};
