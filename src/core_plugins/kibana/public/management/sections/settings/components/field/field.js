import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  EuiButton,
  EuiButtonIcon,
  EuiFieldNumber,
  EuiFieldText,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiTextArea,
  EuiTextColor,
  EuiSelect,
  EuiSwitch,
  keyCodes,
} from '@elastic/eui';

import { isDefaultValue } from '../../lib';

export class Field extends PureComponent {

  static propTypes = {
    setting: PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {
      savedValue: this.getEditableValue(this.props.setting),
      unsavedValue: this.getEditableValue(this.props.setting),
    };
  }

  onFieldChange = (e) => {
    this.setState({
      unsavedValue: e.target.value,
    });
  }

  onFieldKeyDown = ({ keyCode }) => {
    if (keyCodes.ENTER === keyCode) {
      // todo: save this
    }
  };

  getEditableValue(setting) {
    const value = setting.value == null ? setting.defVal : setting.value;
    return setting.type === 'array' ? value.join(', ') : value || '';
  }

  cancelEdit = (e) => {
    const { savedValue } = this.state;
    this.setState({
      unsavedValue: savedValue
    });
  }

  saveEdit = () => {
    //todo: call real function
    this.setState({
      savedValue: this.state.unsavedValue
    });
  }

  renderField(setting) {
    const { unsavedValue } = this.state;

    switch(setting.editor) {
      case 'boolean':
        return (
          <EuiSwitch
            checked={!!unsavedValue}
            onChange={this.onFieldChange}
          />
        );
      case 'markdown':
      case 'json':
        return (
          <EuiTextArea
            value={unsavedValue}
            onChange={this.onFieldChange}
          />
        );
      case 'image':
        return (
          <EuiFilePicker />
        );
      case 'select':
        return (
          <EuiSelect
            value={unsavedValue}
            options={setting.options.map((text) => {
              return { text, value: text };
            })}
            onChange={this.onFieldChange}
          />
        );
      case 'number':
        return (
          <EuiFieldNumber
            value={unsavedValue}
            onChange={this.onFieldChange}
            onKeyDown={this.onFieldKeyDown}
          />
        );
      default:
        return (
          <EuiFieldText
            value={unsavedValue}
            onChange={this.onFieldChange}
            onKeyDown={this.onFieldKeyDown}
          />
        );
    }
  }

  renderLabel(setting) {
    return(
      <Fragment>
        <span> {setting.name} </span>
        {
          setting.isCustom ?
            <EuiTextColor color="subdued"> (Custom Setting) </EuiTextColor>
            : ''
        }
        {
          !isDefaultValue(setting) ?
            <EuiTextColor color="subdued">
              Default:
              <em>
                {
                  (setting.defVal === undefined || setting.defVal === null || setting.defVal === '') ?
                    'null'
                    : String(setting.defVal)
                }
              </em>
            </EuiTextColor>
            : ''
        }
      </Fragment>
    );
  }

  renderHelpText(setting) {
    return (
      <span dangerouslySetInnerHTML={{ __html: setting.description }} />
    );
  }

  renderActions(setting) {
    const { savedValue, unsavedValue } = this.state;
    return(
      <Fragment>
        {
          (savedValue !== unsavedValue) ?
            <Fragment>
              <EuiButtonIcon
                onClick={this.saveEdit}
                iconType="checkInCircleFilled"
                aria-label="Save"
              />
              <EuiButtonIcon
                onClick={this.cancelEdit}
                iconType="cross"
                aria-label="Cancel"
              />
            </Fragment>
            : ''
        }
      </Fragment>
    );
  }

  render() {
    const { setting } = this.props;

    return(
      <EuiFlexGroup>
        <EuiFlexItem grow={false} style={{ minWidth: 400 }}>
          <EuiFormRow
            label={this.renderLabel(setting)}
            helpText={this.renderHelpText(setting)}
          >
            {this.renderField(setting)}
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow hasEmptyLabelSpace>
            {this.renderActions(setting)}
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
