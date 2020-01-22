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
import { npStart } from 'ui/new_platform';

import 'brace/theme/textmate';
import 'brace/mode/markdown';

import { toastNotifications } from 'ui/notify';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCode,
  EuiCodeBlock,
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
  EuiToolTip,
  EuiText,
  EuiSelect,
  EuiSwitch,
  keyCodes,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { isDefaultValue } from '../../lib';

export class Field extends PureComponent {
  static propTypes = {
    setting: PropTypes.object.isRequired,
    save: PropTypes.func.isRequired,
    clear: PropTypes.func.isRequired,
    enableSaving: PropTypes.bool.isRequired,
  };

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

  UNSAFE_componentWillReceiveProps(nextProps) {
    const { unsavedValue } = this.state;
    const { type, value, defVal } = nextProps.setting;
    const editableValue = this.getEditableValue(type, value, defVal);

    this.setState({
      savedValue: editableValue,
      unsavedValue: value === null || value === undefined ? editableValue : unsavedValue,
    });
  }

  getEditableValue(type, value, defVal) {
    const val = value === null || value === undefined ? defVal : value;
    switch (type) {
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

  getDisplayedDefaultValue(type, defVal, optionLabels = {}) {
    if (defVal === undefined || defVal === null || defVal === '') {
      return 'null';
    }
    switch (type) {
      case 'array':
        return defVal.join(', ');
      case 'select':
        return optionLabels.hasOwnProperty(defVal) ? optionLabels[defVal] : String(defVal);
      default:
        return String(defVal);
    }
  }

  setLoading(loading) {
    this.setState({
      loading,
    });
  }

  clearError() {
    this.setState({
      isInvalid: false,
      error: null,
    });
  }

  onCodeEditorChange = value => {
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
          error = (
            <FormattedMessage
              id="kbn.management.settings.field.codeEditorSyntaxErrorMessage"
              defaultMessage="Invalid JSON syntax"
            />
          );
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
  };

  onFieldChange = e => {
    const value = e.target.value;
    const { type, validation } = this.props.setting;
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

    let isInvalid = false;
    let error = undefined;

    if (validation && validation.regex) {
      if (!validation.regex.test(newUnsavedValue)) {
        error = validation.message;
        isInvalid = true;
      }
    }

    this.setState({
      unsavedValue: newUnsavedValue,
      isInvalid,
      error,
    });
  };

  onFieldKeyDown = ({ keyCode }) => {
    if (keyCode === keyCodes.ENTER) {
      this.saveEdit();
    }
    if (keyCode === keyCodes.ESCAPE) {
      this.cancelEdit();
    }
  };

  onFieldEscape = ({ keyCode }) => {
    if (keyCode === keyCodes.ESCAPE) {
      this.cancelEdit();
    }
  };

  onImageChange = async files => {
    if (!files.length) {
      this.clearError();
      this.setState({
        unsavedValue: null,
      });
      return;
    }

    const file = files[0];
    const { maxSize } = this.props.setting.validation;
    try {
      const base64Image = await this.getImageAsBase64(file);
      const isInvalid = !!(maxSize && maxSize.length && base64Image.length > maxSize.length);
      this.setState({
        isInvalid,
        error: isInvalid
          ? i18n.translate('kbn.management.settings.field.imageTooLargeErrorMessage', {
              defaultMessage: 'Image is too large, maximum size is {maxSizeDescription}',
              values: {
                maxSizeDescription: maxSize.description,
              },
            })
          : null,
        changeImage: true,
        unsavedValue: base64Image,
      });
    } catch (err) {
      toastNotifications.addDanger(
        i18n.translate('kbn.management.settings.field.imageChangeErrorMessage', {
          defaultMessage: 'Image could not be saved',
        })
      );
      this.cancelChangeImage();
    }
  };

  getImageAsBase64(file) {
    if (!file instanceof File) {
      return null;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    return new Promise((resolve, reject) => {
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.onerror = err => {
        reject(err);
      };
    });
  }

  changeImage = () => {
    this.setState({
      changeImage: true,
    });
  };

  cancelChangeImage = () => {
    const { savedValue } = this.state;

    if (this.changeImageForm) {
      this.changeImageForm.fileInput.value = null;
      this.changeImageForm.handleChange();
    }

    this.setState({
      changeImage: false,
      unsavedValue: savedValue,
    });
  };

  cancelEdit = () => {
    const { savedValue } = this.state;
    this.clearError();
    this.setState({
      unsavedValue: savedValue,
    });
  };

  showPageReloadToast = () => {
    if (this.props.setting.requiresPageReload) {
      toastNotifications.add({
        title: i18n.translate('kbn.management.settings.field.requiresPageReloadToastDescription', {
          defaultMessage: 'Please reload the page for the "{settingName}" setting to take effect.',
          values: {
            settingName: this.props.setting.displayName || this.props.setting.name,
          },
        }),
        text: (
          <>
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButton size="s" onClick={() => window.location.reload()}>
                  {i18n.translate(
                    'kbn.management.settings.field.requiresPageReloadToastButtonLabel',
                    { defaultMessage: 'Reload page' }
                  )}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        ),
        color: 'success',
      });
    }
  };

  saveEdit = async () => {
    const { name, defVal, type } = this.props.setting;
    const { changeImage, savedValue, unsavedValue, isJsonArray } = this.state;

    if (savedValue === unsavedValue) {
      return;
    }

    let valueToSave = unsavedValue;
    let isSameValue = false;

    switch (type) {
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

      this.showPageReloadToast();

      if (changeImage) {
        this.cancelChangeImage();
      }
    } catch (e) {
      toastNotifications.addDanger(
        i18n.translate('kbn.management.settings.field.saveFieldErrorMessage', {
          defaultMessage: 'Unable to save {name}',
          values: { name },
        })
      );
    }
    this.setLoading(false);
  };

  resetField = async () => {
    const { name } = this.props.setting;
    this.setLoading(true);
    try {
      await this.props.clear(name);
      this.showPageReloadToast();
      this.cancelChangeImage();
      this.clearError();
    } catch (e) {
      toastNotifications.addDanger(
        i18n.translate('kbn.management.settings.field.resetFieldErrorMessage', {
          defaultMessage: 'Unable to reset {name}',
          values: { name },
        })
      );
    }
    this.setLoading(false);
  };

  renderField(setting) {
    const { enableSaving } = this.props;
    const { loading, changeImage, unsavedValue } = this.state;
    const { name, value, type, options, optionLabels = {}, isOverridden, ariaName } = setting;

    switch (type) {
      case 'boolean':
        return (
          <EuiSwitch
            label={
              !!unsavedValue ? (
                <FormattedMessage id="kbn.management.settings.field.onLabel" defaultMessage="On" />
              ) : (
                <FormattedMessage
                  id="kbn.management.settings.field.offLabel"
                  defaultMessage="Off"
                />
              )
            }
            checked={!!unsavedValue}
            onChange={this.onFieldChange}
            disabled={loading || isOverridden || !enableSaving}
            onKeyDown={this.onFieldKeyDown}
            data-test-subj={`advancedSetting-editField-${name}`}
            aria-label={ariaName}
          />
        );
      case 'markdown':
      case 'json':
        return (
          <div data-test-subj={`advancedSetting-editField-${name}`}>
            <EuiCodeEditor
              aria-label={ariaName}
              mode={type}
              theme="textmate"
              value={unsavedValue}
              onChange={this.onCodeEditorChange}
              width="100%"
              height="auto"
              minLines={6}
              maxLines={30}
              isReadOnly={isOverridden || !enableSaving}
              setOptions={{
                showLineNumbers: false,
                tabSize: 2,
              }}
              editorProps={{
                $blockScrolling: Infinity,
              }}
              showGutter={false}
            />
          </div>
        );
      case 'image':
        if (!isDefaultValue(setting) && !changeImage) {
          return <EuiImage aria-label={ariaName} allowFullScreen url={value} alt={name} />;
        } else {
          return (
            <EuiFilePicker
              disabled={loading || isOverridden || !enableSaving}
              onChange={this.onImageChange}
              accept=".jpg,.jpeg,.png"
              ref={input => {
                this.changeImageForm = input;
              }}
              onKeyDown={this.onFieldEscape}
              data-test-subj={`advancedSetting-editField-${name}`}
            />
          );
        }
      case 'select':
        return (
          <EuiSelect
            aria-label={ariaName}
            value={unsavedValue}
            options={options.map(option => {
              return {
                text: optionLabels.hasOwnProperty(option) ? optionLabels[option] : option,
                value: option,
              };
            })}
            onChange={this.onFieldChange}
            isLoading={loading}
            disabled={loading || isOverridden || !enableSaving}
            onKeyDown={this.onFieldKeyDown}
            data-test-subj={`advancedSetting-editField-${name}`}
          />
        );
      case 'number':
        return (
          <EuiFieldNumber
            aria-label={ariaName}
            value={unsavedValue}
            onChange={this.onFieldChange}
            isLoading={loading}
            disabled={loading || isOverridden || !enableSaving}
            onKeyDown={this.onFieldKeyDown}
            data-test-subj={`advancedSetting-editField-${name}`}
          />
        );
      default:
        return (
          <EuiFieldText
            aria-label={ariaName}
            value={unsavedValue}
            onChange={this.onFieldChange}
            isLoading={loading}
            disabled={loading || isOverridden || !enableSaving}
            onKeyDown={this.onFieldKeyDown}
            data-test-subj={`advancedSetting-editField-${name}`}
          />
        );
    }
  }

  renderLabel(setting) {
    return setting.name;
  }

  renderHelpText(setting) {
    if (setting.isOverridden) {
      return (
        <EuiText size="xs">
          <FormattedMessage
            id="kbn.management.settings.field.helpText"
            defaultMessage="This setting is overridden by the Kibana server and can not be changed."
          />
        </EuiText>
      );
    }

    const canUpdateSetting = this.props.enableSaving;
    const defaultLink = this.renderResetToDefaultLink(setting);
    const imageLink = this.renderChangeImageLink(setting);

    if (canUpdateSetting && (defaultLink || imageLink)) {
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
        {setting.isCustom ? (
          <EuiIconTip
            type="asterisk"
            color="primary"
            aria-label={i18n.translate('kbn.management.settings.field.customSettingAriaLabel', {
              defaultMessage: 'Custom setting',
            })}
            content={
              <FormattedMessage
                id="kbn.management.settings.field.customSettingTooltip"
                defaultMessage="Custom setting"
              />
            }
          />
        ) : (
          ''
        )}
      </h3>
    );
  }

  renderDescription(setting) {
    let description;
    let deprecation;

    if (setting.deprecation) {
      const { links } = npStart.core.docLinks;

      deprecation = (
        <>
          <EuiToolTip content={setting.deprecation.message}>
            <EuiBadge
              color="warning"
              onClick={() => {
                window.open(links.management[setting.deprecation.docLinksKey], '_blank');
              }}
              onClickAriaLabel={i18n.translate(
                'kbn.management.settings.field.deprecationClickAreaLabel',
                {
                  defaultMessage: 'Click to view deprecation documentation for {settingName}.',
                  values: {
                    settingName: setting.name,
                  },
                }
              )}
            >
              Deprecated
            </EuiBadge>
          </EuiToolTip>
          <EuiSpacer size="s" />
        </>
      );
    }

    if (React.isValidElement(setting.description)) {
      description = setting.description;
    } else {
      description = (
        <div
          /*
           * Justification for dangerouslySetInnerHTML:
           * Setting description may contain formatting and links to documentation.
           */
          dangerouslySetInnerHTML={{ __html: setting.description }} //eslint-disable-line react/no-danger
        />
      );
    }

    return (
      <Fragment>
        {deprecation}
        {description}
        {this.renderDefaultValue(setting)}
      </Fragment>
    );
  }

  renderDefaultValue(setting) {
    const { type, defVal, optionLabels } = setting;
    if (isDefaultValue(setting)) {
      return;
    }
    return (
      <Fragment>
        <EuiSpacer size="s" />
        <EuiText size="xs">
          {type === 'json' ? (
            <Fragment>
              <FormattedMessage
                id="kbn.management.settings.field.defaultValueTypeJsonText"
                defaultMessage="Default: {value}"
                values={{
                  value: (
                    <EuiCodeBlock
                      language="json"
                      paddingSize="s"
                      overflowHeight={defVal.length >= 500 ? 300 : null}
                    >
                      {this.getDisplayedDefaultValue(type, defVal)}
                    </EuiCodeBlock>
                  ),
                }}
              />
            </Fragment>
          ) : (
            <Fragment>
              <FormattedMessage
                id="kbn.management.settings.field.defaultValueText"
                defaultMessage="Default: {value}"
                values={{
                  value: (
                    <EuiCode>{this.getDisplayedDefaultValue(type, defVal, optionLabels)}</EuiCode>
                  ),
                }}
              />
            </Fragment>
          )}
        </EuiText>
      </Fragment>
    );
  }

  renderResetToDefaultLink(setting) {
    const { ariaName, name } = setting;
    if (isDefaultValue(setting)) {
      return;
    }
    return (
      <span>
        <EuiLink
          aria-label={i18n.translate('kbn.management.settings.field.resetToDefaultLinkAriaLabel', {
            defaultMessage: 'Reset {ariaName} to default',
            values: {
              ariaName,
            },
          })}
          onClick={this.resetField}
          data-test-subj={`advancedSetting-resetField-${name}`}
        >
          <FormattedMessage
            id="kbn.management.settings.field.resetToDefaultLinkText"
            defaultMessage="Reset to default"
          />
        </EuiLink>
        &nbsp;&nbsp;&nbsp;
      </span>
    );
  }

  renderChangeImageLink(setting) {
    const { changeImage } = this.state;
    const { type, value, ariaName, name } = setting;
    if (type !== 'image' || !value || changeImage) {
      return;
    }
    return (
      <span>
        <EuiLink
          aria-label={i18n.translate('kbn.management.settings.field.changeImageLinkAriaLabel', {
            defaultMessage: 'Change {ariaName}',
            values: {
              ariaName,
            },
          })}
          onClick={this.changeImage}
          data-test-subj={`advancedSetting-changeImage-${name}`}
        >
          <FormattedMessage
            id="kbn.management.settings.field.changeImageLinkText"
            defaultMessage="Change image"
          />
        </EuiLink>
      </span>
    );
  }

  renderActions(setting) {
    const { ariaName, name } = setting;
    const { loading, isInvalid, changeImage, savedValue, unsavedValue } = this.state;
    const isDisabled = loading || setting.isOverridden;

    if (savedValue === unsavedValue && !changeImage) {
      return;
    }

    return (
      <EuiFormRow className="mgtAdvancedSettings__fieldActions" hasEmptyLabelSpace>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              aria-label={i18n.translate('kbn.management.settings.field.saveButtonAriaLabel', {
                defaultMessage: 'Save {ariaName}',
                values: {
                  ariaName,
                },
              })}
              onClick={this.saveEdit}
              disabled={isDisabled || isInvalid}
              data-test-subj={`advancedSetting-saveEditField-${name}`}
            >
              <FormattedMessage
                id="kbn.management.settings.field.saveButtonLabel"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              aria-label={i18n.translate(
                'kbn.management.settings.field.cancelEditingButtonAriaLabel',
                {
                  defaultMessage: 'Cancel editing {ariaName}',
                  values: {
                    ariaName,
                  },
                }
              )}
              onClick={() => (changeImage ? this.cancelChangeImage() : this.cancelEdit())}
              disabled={isDisabled}
              data-test-subj={`advancedSetting-cancelEditField-${name}`}
            >
              <FormattedMessage
                id="kbn.management.settings.field.cancelEditingButtonLabel"
                defaultMessage="Cancel"
              />
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
      <EuiFlexGroup className="mgtAdvancedSettings__field">
        <EuiFlexItem grow={false}>
          <EuiDescribedFormGroup
            className="mgtAdvancedSettings__fieldWrapper"
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
              className="mgtAdvancedSettings__fieldRow"
              hasChildLabel={setting.type !== 'boolean'}
            >
              {this.renderField(setting)}
            </EuiFormRow>
          </EuiDescribedFormGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{this.renderActions(setting)}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
