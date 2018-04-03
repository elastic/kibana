import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { toastNotifications } from 'ui/notify';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldNumber,
  EuiFieldText,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
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
      isInvalid: false,
      error: null,
      loading: false,
      changeImage: false,
      savedValue: editableValue,
      unsavedValue: editableValue,
    };
    this.changeImageForm = null;
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
      case 'boolean':
        return !!val;
      case 'number':
        return Number(val);
      case 'image':
        return val;
      default:
        return val || '';
    }
  }

  getDisplayedDefaultValue(type, defVal) {
    if(defVal === undefined || defVal === null || defVal === '') {
      return 'null';
    }
    switch(type) {
      case 'array':
        return defVal.join(', ');
      default:
        return String(defVal);
    }
  }

  setLoading(loading) {
    this.setState({
      loading
    });
  }

  clearError() {
    this.setState({
      isInvalid: false,
      error: null,
    });
  }

  onFieldChange = (e) => {
    const value = e.target.value;
    const { type } = this.props.setting;
    const { unsavedValue } = this.state;

    let newUnsavedValue = undefined;
    let isInvalid = false;
    let error = null;

    switch (type) {
      case 'boolean':
        newUnsavedValue = !unsavedValue;
        break;
      case 'number':
        newUnsavedValue = Number(value);
        break;
      case 'json':
        newUnsavedValue = value.trim() || '{}';
        try {
          JSON.parse(newUnsavedValue);
        } catch (e) {
          isInvalid = true;
          error = 'Invalid JSON syntax';
        }
        break;
      default:
        newUnsavedValue = value;
    }
    this.setState({
      error,
      isInvalid,
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

  onFieldEscape = ({ keyCode }) => {
    if (keyCode === keyCodes.ESCAPE) {
      this.cancelEdit();
    }
  }

  onImageChange = async (files) => {
    if(!files.length) {
      this.clearError();
      this.setState({
        unsavedValue: null,
      });
      return;
    }

    const file = files[0];
    const { maxSize } = this.props.setting.options;
    try {
      const base64Image = await this.getImageAsBase64(file);
      const isInvalid = !!(maxSize && maxSize.length && base64Image.length > maxSize.length);
      this.setState({
        isInvalid,
        error: isInvalid ? `Image is too large, maximum size is ${maxSize.description}` : null,
        changeImage: true,
        unsavedValue: base64Image,
      });
    } catch(err) {
      toastNotifications.addDanger('Image could not be saved');
      this.cancelChangeImage();
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

    if(this.changeImageForm) {
      this.changeImageForm.fileInput.value = null;
      this.changeImageForm.handleChange();
    }

    this.setState({
      changeImage: false,
      unsavedValue: savedValue,
    });
  }

  cancelEdit = () => {
    const { savedValue } = this.state;
    this.clearError();
    this.setState({
      unsavedValue: savedValue,
    });
  }

  saveEdit = async () => {
    const { name, defVal, type } = this.props.setting;
    const { changeImage, savedValue, unsavedValue } = this.state;

    if(savedValue === unsavedValue) {
      return;
    }

    let valueToSave = unsavedValue;
    let isSameValue = false;

    switch(type) {
      case 'array':
        valueToSave = valueToSave.split(',').map(val => val.trim());
        isSameValue = valueToSave.join(',') === defVal.join(',');
        break;
      case 'json':
        valueToSave = valueToSave.trim() ? valueToSave.trim() : '{}';
      default:
        isSameValue = valueToSave === defVal;
    }

    this.setLoading(true);
    try {
      if (isSameValue) {
        await this.props.clear(name);
      } else {
        await this.props.save(name, valueToSave);
      }

      if(changeImage) {
        this.cancelChangeImage();
      }
    } catch(e) {
      toastNotifications.addDanger(`Unable to save ${name}`);
    }
    this.setLoading(false);
  }

  resetField = async () => {
    const { name } = this.props.setting;
    this.setLoading(true);
    try {
      await this.props.clear(name);
      this.cancelChangeImage();
      this.clearError();
    } catch(e) {
      toastNotifications.addDanger(`Unable to reset ${name}`);
    }
    this.setLoading(false);
  }

  renderField(setting) {
    const { loading, changeImage, unsavedValue, isInvalid } = this.state;
    const { name, value, type, options } = setting;

    switch(type) {
      case 'boolean':
        return (
          <EuiSwitch
            checked={!!unsavedValue}
            onChange={this.onFieldChange}
            disabled={loading}
            onKeyDown={this.onFieldKeyDown}
            data-test-subj={`advancedSetting-editField-${name}`}
          />
        );
      case 'markdown':
      case 'json':
        return (
          <EuiTextArea
            isInvalid={isInvalid}
            value={unsavedValue}
            onChange={this.onFieldChange}
            disabled={loading}
            onKeyDown={this.onFieldEscape}
            data-test-subj={`advancedSetting-editField-${name}`}
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
          return (
            <EuiFilePicker
              disabled={loading}
              onChange={this.onImageChange}
              accept=".jpg,.jpeg,.png"
              ref={(input) => { this.changeImageForm = input; }}
              onKeyDown={this.onFieldEscape}
              data-test-subj={`advancedSetting-editField-${name}`}
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
            onKeyDown={this.onFieldKeyDown}
            data-test-subj={`advancedSetting-editField-${name}`}
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
            data-test-subj={`advancedSetting-editField-${name}`}
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
            data-test-subj={`advancedSetting-editField-${name}`}
          />
        );
    }
  }

  renderLabel(setting) {
    return(
      <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween">
        <EuiFlexItem className="advancedSettings__field__name">{setting.displayName}</EuiFlexItem>
        <EuiFlexItem className="advancedSettings__field__key" grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            {setting.name !== setting.displayName ?
              <EuiFlexItem className="advancedSettings__field__key__wrapper">
                <EuiTextColor
                  className="advancedSettings__field__key__text"
                  color="subdued"
                  aria-label={setting.ariaName}
                >
                  {setting.name}
                </EuiTextColor>
              </EuiFlexItem>
              : ''}
            {setting.isCustom ?
              <EuiFlexItem grow={false}>
                <EuiIconTip type="asterisk" color="primary" aria-label="Custom setting" content="Custom setting" />
              </EuiFlexItem>
              : ''}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  renderHelpText(setting) {
    return (
      <div>
        <div>
          <span dangerouslySetInnerHTML={{ __html: setting.description }} />
        </div>
        {this.renderDefaultValue(setting)}
        {this.renderChangeImageLink(setting)}
      </div>
    );
  }

  renderDefaultValue(setting) {
    const { type, defVal, ariaName, name } = setting;
    if(isDefaultValue(setting)) {
      return;
    }
    return (
      <span>
        Default: <em>{this.getDisplayedDefaultValue(type, defVal)}</em>
        &nbsp;&nbsp;
        <EuiLink
          aria-label={`Reset ${ariaName}`}
          onClick={this.resetField}
          data-test-subj={`advancedSetting-resetField-${name}`}
        >
          Reset
        </EuiLink>
        &nbsp;&nbsp;
      </span>
    );
  }

  renderChangeImageLink(setting) {
    const { changeImage } = this.state;
    const { type, value, ariaName, name } = setting;
    if(type !== 'image' || !value || changeImage) {
      return;
    }
    return (
      <span>
        <EuiLink
          aria-label={`Change ${ariaName}`}
          onClick={this.changeImage}
          data-test-subj={`advancedSetting-changeImage-${name}`}
        >
          Change
        </EuiLink>
      </span>
    );
  }

  renderActions(setting) {
    const { ariaName, name } = setting;
    const { loading, isInvalid, changeImage, savedValue, unsavedValue } = this.state;
    if(savedValue === unsavedValue && !changeImage) {
      return;
    }
    return (
      <EuiFlexItem>
        <EuiFormRow hasEmptyLabelSpace>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                aria-label={`Save ${ariaName}`}
                onClick={this.saveEdit}
                disabled={loading || isInvalid}
                data-test-subj={`advancedSetting-saveEditField-${name}`}
              >
                Save
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                aria-label={`Cancel editing ${ariaName}`}
                onClick={() => changeImage ? this.cancelChangeImage() : this.cancelEdit()}
                disabled={loading}
                data-test-subj={`advancedSetting-cancelEditField-${name}`}
              >
                Cancel
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </EuiFlexItem>
    );
  }

  render() {
    const { setting } = this.props;
    const { error, isInvalid } = this.state;

    return(
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={false} style={{ minWidth: 400 }}>
          <EuiFormRow
            isInvalid={isInvalid}
            error={error}
            label={this.renderLabel(setting)}
            helpText={this.renderHelpText(setting)}
          >
            {this.renderField(setting)}
          </EuiFormRow>
        </EuiFlexItem>
        {this.renderActions(setting)}
      </EuiFlexGroup>
    );
  }
}
