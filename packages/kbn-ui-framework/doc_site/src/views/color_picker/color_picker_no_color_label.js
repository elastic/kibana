import React from 'react';

import {
  KuiColorPicker,
  KuiFieldGroup,
  KuiFieldGroupSection,
} from '../../../../components';

export class ColorPickerNoColorLabel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      color: '#00FFFF'
    };
  }

  handleChange = (value) => {
    this.setState({ color: value });
  };

  render() {
    return (
      <KuiFieldGroup>
        <KuiFieldGroupSection>
          <label className="kuiLabel">
            Foreground color
          </label>
        </KuiFieldGroupSection>

        <KuiFieldGroupSection>
          <KuiColorPicker
            onChange={this.handleChange}
            color={this.state.color}
            showColorLabel={false}
          />
        </KuiFieldGroupSection>
      </KuiFieldGroup>
    );
  }
}
