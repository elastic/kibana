import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  EuiButton,
  EuiFieldNumber,
  EuiFieldText,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiImage,
  EuiLink,
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
    save: PropTypes.func.isRequired,
    clear: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);
    const { type, value, defVal } = this.props.setting;
    const editableValue = this.getEditableValue(type, value, defVal);

    this.state = {
      loading: false,
      changeImage: false,
      savedValue: editableValue,
      unsavedValue: editableValue,
    };
  }

  componentWillReceiveProps(nextProps) {
    const { unsavedValue } = this.state;
    const { type, value, defVal } = nextProps.setting;
    const editableValue = this.getEditableValue(type, value, defVal);

    this.setState({
      savedValue: editableValue,
      unsavedValue: (value === null || value === undefined) ? editableValue : unsavedValue,
    });
  }

  getEditableValue(type, value, defVal) {
    const val = (value === null || value === undefined) ? defVal : value;
    switch(type) {
      case 'array':
        return val.join(', ');
      case 'number':
        return Number(val);
      case 'image':
        return val;
      default:
        return val || '';
    }
  }

  setLoading(loading) {
    this.setState({
      loading
    });
  }

  onFieldChange = (e) => {
    let newUnsavedValue = undefined;
    const value = e.target.value;
    const { type } = this.props.setting;
    const { unsavedValue } = this.state;
    switch (type) {
      case 'boolean':
        newUnsavedValue = !unsavedValue;
        break;
      case 'number':
        newUnsavedValue = Number(value);
        break;
      default:
        newUnsavedValue = value;
    }
    this.setState({
      unsavedValue: newUnsavedValue,
    });
  }

  onFieldKeyDown = ({ keyCode }) => {
    if (keyCode === keyCodes.ENTER) {
      this.saveEdit();
    }
    if (keyCode === keyCodes.ESCAPE) {
      this.cancelEdit();
    }
  }

  onImageChange = async (files) => {
    if(!files.length) {
      this.setState({
        unsavedValue: null,
      });
      return;
    }

    const file = files[0];
    try {
      const base64Image = await this.getImageAsBase64(file);
      this.setState({
        unsavedValue: base64Image,
      });
    } catch(err) {
      this.setState({
        unsavedValue: null,
      });
    }
  }

  getImageAsBase64(file) {
    if(!file instanceof File) {
      return null;
    }

    const reader  = new FileReader();
    reader.readAsDataURL(file);

    return new Promise((resolve, reject) => {
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.onerror = (err) => {
        reject(err);
      };
    });
  }

  changeImage = () => {
    this.setState({
      changeImage: true,
    });
  }

  cancelChangeImage = () => {
    const { savedValue } = this.state;
    this.setState({
      changeImage: false,
      unsavedValue: savedValue,
    });
  }

  cancelEdit = () => {
    const { savedValue } = this.state;
    this.setState({
      unsavedValue: savedValue,
    });
  }

  saveEdit = async () => {
    const { name, defVal, type } = this.props.setting;
    const { savedValue, unsavedValue } = this.state;
    let value = unsavedValue;

    if(savedValue === value) {
      return;
    }

    switch(type) {
      case 'array':
        return value = value.split(',').map(val => val.trim());
      case 'json':
        return value = value.trim() ? value.trim() : '{}';
      default:
        return;
    }

    this.setLoading(true);
    try {
      if (value === defVal) {
        await this.props.clear(name);
      } else {
        await this.props.save(name, value);
      }
      this.cancelChangeImage();
    } catch(e) {
      //todo: error handling here
      console.log('we got an error jen', e);
    }
    this.setLoading(false);
  }

  resetField = async () => {
    const { name } = this.props.setting;
    this.setLoading(true);
    try {
      await this.props.clear(name);
      this.cancelChangeImage();
    } catch(e) {
      //todo: error handling here
      console.log('we got an error jen', e);
    }
    this.setLoading(false);
  }

  renderField(setting) {
    const { loading, changeImage, changeImageValue, unsavedValue } = this.state;
    const { name, value, editor, options } = setting;

    switch(editor) {
      case 'boolean':
        return (
          <EuiSwitch
            checked={!!unsavedValue}
            onChange={this.onFieldChange}
            disabled={loading}
          />
        );
      case 'markdown':
      case 'json':
        return (
          <EuiTextArea
            value={unsavedValue}
            onChange={this.onFieldChange}
            disabled={loading}
          />
        );
      case 'image':
        if(!isDefaultValue(setting) && !changeImage) {
          return (
            <EuiImage
              allowFullScreen
              url={value}
              alt={name}
            />
          );
        } else {
          console.log(this.state);
          return (
            <EuiFilePicker
              disabled={loading}
              onChange={this.onImageChange}
              accept=".jpg,.jpeg,.png"
              max={options.maxSize && options.maxSize.length}
            />
          );
        }
      case 'select':
        return (
          <EuiSelect
            value={unsavedValue}
            options={options.map((text) => {
              return { text, value: text };
            })}
            onChange={this.onFieldChange}
            isLoading={loading}
            disabled={loading}
          />
        );
      case 'number':
        return (
          <EuiFieldNumber
            value={unsavedValue}
            onChange={this.onFieldChange}
            isLoading={loading}
            disabled={loading}
            onKeyDown={this.onFieldKeyDown}
          />
        );
      default:
        return (
          <EuiFieldText
            value={unsavedValue}
            onChange={this.onFieldChange}
            isLoading={loading}
            disabled={loading}
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
      </Fragment>
    );
  }

  renderHelpText(setting) {
    const { changeImage } = this.state;
    return (
      <Fragment>
        <div>
          <span dangerouslySetInnerHTML={{ __html: setting.description }} />
        </div>
        {
          !isDefaultValue(setting) ?
            <div>
              Default:&nbsp;
              <em>
                {
                  (setting.defVal === undefined || setting.defVal === null || setting.defVal === '') ?
                    'null'
                    : String(setting.defVal)
                }
              </em>
              &nbsp;&nbsp;
              <EuiLink onClick={this.resetField}>
                Reset
              </EuiLink>
              {
                setting.editor === 'image' && !isDefaultValue(setting) && !changeImage ?
                  <Fragment>
                    &nbsp;
                    <EuiLink onClick={this.changeImage}>
                      Change
                    </EuiLink>
                  </Fragment>
                  : ''
              }
            </div>
            : ''
        }
      </Fragment>
    );
  }

  render() {
    const { setting } = this.props;
    const { loading, changeImage, savedValue, unsavedValue } = this.state;

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
        {
          (savedValue !== unsavedValue || changeImage) ?
            <EuiFlexItem>
              <EuiFormRow hasEmptyLabelSpace>
                <EuiFlexGroup alignItems="center">
                  <EuiFlexItem>
                    <EuiButton
                      fill
                      onClick={this.saveEdit}
                      disabled={loading}
                    >
                      Save
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiButton
                      onClick={() => changeImage ? this.cancelChangeImage() : this.cancelEdit()}
                      disabled={loading}
                    >
                      Cancel
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFormRow>
            </EuiFlexItem>
            : ''
        }
      </EuiFlexGroup>
    );
  }
}
