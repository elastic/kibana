/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';

import 'brace/theme/textmate';
import 'brace/mode/markdown';

import { toastNotifications } from 'ui/notify';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCode,
  EuiCodeEditor,
  EuiDescribedFormGroup,
  EuiFieldNumber,
  EuiFieldText,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiImage,
  EuiLink,
  EuiSpacer,
  EuiText,
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
      isJsonArray: type === 'json' ? Array.isArray(JSON.parse(defVal || '{}')) : false,
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

  onCodeEditorChange = (value) => {
    const { type } = this.props.setting;
    const { isJsonArray } = this.state;

    let newUnsavedValue = undefined;
    let isInvalid = false;
    let error = null;

    switch (type) {
      case 'json':
        newUnsavedValue = value.trim() || (isJsonArray ? '[]' : '{}');
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

  onFieldChange = (e) => {
    const value = e.target.value;
    const { type } = this.props.setting;
    const { unsavedValue } = this.state;

    let newUnsavedValue = undefined;

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
    const { changeImage, savedValue, unsavedValue, isJsonArray } = this.state;

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
        valueToSave = valueToSave.trim();
        valueToSave = valueToSave || (isJsonArray ? '[]' : '{}');
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
    const { loading, changeImage, unsavedValue } = this.state;
    const { name, value, type, options } = setting;

    switch(type) {
      case 'boolean':
        return (
          <EuiSwitch
            label={!!unsavedValue ? 'On' : 'Off'}
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
          <div data-test-subj={`advancedSetting-editField-${name}`}>
            <EuiCodeEditor
              mode={type}
              theme="textmate"
              value={unsavedValue}
              onChange={this.onCodeEditorChange}
              width="100%"
              height="auto"
              minLines={6}
              maxLines={30}
              setOptions={{
                showLineNumbers: false,
                tabSize: 2,
              }}
              editorProps={{
                $blockScrolling: Infinity
              }}

            />
          </div>
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
      <span aria-label={setting.ariaName}>
        {setting.name}
      </span>
    );
  }

  renderHelpText(setting) {
    const defaultLink = this.renderResetToDefaultLink(setting);
    const imageLink = this.renderChangeImageLink(setting);

    if(defaultLink || imageLink) {
      return (
        <span>
          {defaultLink}
          {imageLink}
        </span>
      );
    }

    return null;
  }

  renderTitle(setting) {
    return (
      <h3>
        {setting.displayName || setting.name}
        {setting.isCustom ?
          <EuiIconTip type="asterisk" color="primary" aria-label="Custom setting" content="Custom setting" />
          : ''}
      </h3>
    );
  }

  renderDescription(setting) {
    return (
      <Fragment>
        <div
          /*
           * Justification for dangerouslySetInnerHTML:
           * Setting description may contain formatting and links to documentation.
           */
          dangerouslySetInnerHTML={{ __html: setting.description }} //eslint-disable-line react/no-danger
        />
        {this.renderDefaultValue(setting)}
      </Fragment>
    );
  }

  renderDefaultValue(setting) {
    const { type, defVal } = setting;
    if(isDefaultValue(setting)) {
      return;
    }
    return (
      <Fragment>
        <EuiSpacer size="s" />
        <EuiText size="xs">
          Default: <EuiCode>{this.getDisplayedDefaultValue(type, defVal)}</EuiCode>
        </EuiText>
      </Fragment>
    );
  }

  renderResetToDefaultLink(setting) {
    const { ariaName, name } = setting;
    if(isDefaultValue(setting)) {
      return;
    }
    return (
      <span>
        <EuiLink
          aria-label={`Reset ${ariaName} to default`}
          onClick={this.resetField}
          data-test-subj={`advancedSetting-resetField-${name}`}
        >
          Reset to default
        </EuiLink>
        &nbsp;&nbsp;&nbsp;
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
          Change image
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
      <EuiFormRow className="advancedSettings__field__actions" hasEmptyLabelSpace>
        <EuiFlexGroup>
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
    );
  }

  render() {
    const { setting } = this.props;
    const { error, isInvalid } = this.state;

    return (
      <EuiFlexGroup className="advancedSettings__field">
        <EuiFlexItem grow={false}>
          <EuiDescribedFormGroup
            className="advancedSettings__field__wrapper"
            title={this.renderTitle(setting)}
            description={this.renderDescription(setting)}
            idAria={`${setting.name}-aria`}
          >
            <EuiFormRow
              isInvalid={isInvalid}
              error={error}
              label={this.renderLabel(setting)}
              helpText={this.renderHelpText(setting)}
              describedByIds={[`${setting.name}-aria`]}
            >
              {this.renderField(setting)}
            </EuiFormRow>
          </EuiDescribedFormGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {this.renderActions(setting)}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
