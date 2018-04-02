import React from 'react';

import {
  KuiColorPicker,
  KuiFieldGroup,
  KuiFieldGroupSection,
  KuiKeyboardAccessible,
} from '../../../../components';

export class ColorPickerLabelAndClear extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      color: null
    };
  }

  handleChange = (value) => {
    this.setState({ color: value });
  };

  resetColor = () => {
    this.setState({ color: null });
  };

  render() {
    return (
      <KuiFieldGroup>
        <KuiFieldGroupSection>
          <label className="kuiLabel">
            Background color
          </label>
        </KuiFieldGroupSection>

        <KuiFieldGroupSection>
          <KuiColorPicker
            onChange={this.handleChange}
            color={this.state.color}
          />
        </KuiFieldGroupSection>

        <KuiFieldGroupSection>
          <p className="kuiText">
            <KuiKeyboardAccessible>
              <a className="kuiLink" onClick={this.resetColor}>
                Reset
              </a>
            </KuiKeyboardAccessible>
          </p>
        </KuiFieldGroupSection>
      </KuiFieldGroup>
    );
  }
}
