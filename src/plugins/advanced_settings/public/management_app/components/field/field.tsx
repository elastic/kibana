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
import ReactDOM from 'react-dom';

import 'brace/theme/textmate';
import 'brace/mode/markdown';

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCode,
  EuiCodeBlock,
  // @ts-ignore
  EuiCodeEditor,
  EuiDescribedFormGroup,
  EuiFieldNumber,
  EuiFieldText,
  // @ts-ignore
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
  EuiSwitchEvent,
  keyCodes,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { FieldSetting } from '../../types';
import { isDefaultValue } from '../../lib';
import {
  UiSettingsType,
  ImageValidation,
  StringValidationRegex,
  DocLinksStart,
  ToastsStart,
} from '../../../../../../core/public';

interface FieldProps {
  setting: FieldSetting;
  save: (name: string, value: string) => Promise<boolean>;
  clear: (name: string) => Promise<boolean>;
  enableSaving: boolean;
  dockLinks: DocLinksStart['links'];
  toasts: ToastsStart;
}

interface FieldState {
  unsavedValue: any;
  savedValue: any;
  loading: boolean;
  isInvalid: boolean;
  error: string | null;
  changeImage: boolean;
  isJsonArray: boolean;
}

export class Field extends PureComponent<FieldProps, FieldState> {
  private changeImageForm: EuiFilePicker | undefined;
  constructor(props: FieldProps) {
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
      isJsonArray: type === 'json' ? Array.isArray(JSON.parse(String(defVal) || '{}')) : false,
    };
  }

  UNSAFE_componentWillReceiveProps(nextProps: FieldProps) {
    const { unsavedValue } = this.state;
    const { type, value, defVal } = nextProps.setting;
    const editableValue = this.getEditableValue(type, value, defVal);

    this.setState({
      savedValue: editableValue,
      unsavedValue: value === null || value === undefined ? editableValue : unsavedValue,
    });
  }

  getEditableValue(
    type: UiSettingsType,
    value: FieldSetting['value'],
    defVal: FieldSetting['defVal']
  ) {
    const val = value === null || value === undefined ? defVal : value;
    switch (type) {
      case 'array':
        return (val as string[]).join(', ');
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

  getDisplayedDefaultValue(
    type: UiSettingsType,
    defVal: FieldSetting['defVal'],
    optionLabels: Record<string, any> = {}
  ) {
    if (defVal === undefined || defVal === null || defVal === '') {
      return 'null';
    }
    switch (type) {
      case 'array':
        return (defVal as string[]).join(', ');
      case 'select':
        return optionLabels.hasOwnProperty(String(defVal))
          ? optionLabels[String(defVal)]
          : String(defVal);
      default:
        return String(defVal);
    }
  }

  setLoading(loading: boolean) {
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

  onCodeEditorChange = (value: UiSettingsType) => {
    const { type } = this.props.setting;
    const { isJsonArray } = this.state;

    let newUnsavedValue;
    let isInvalid = false;
    let error = null;

    switch (type) {
      case 'json':
        newUnsavedValue = value.trim() || (isJsonArray ? '[]' : '{}');
        try {
          JSON.parse(newUnsavedValue);
        } catch (e) {
          isInvalid = true;
          error = i18n.translate('advancedSettings.field.codeEditorSyntaxErrorMessage', {
            defaultMessage: 'Invalid JSON syntax',
          });
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

  onFieldChangeSwitch = (e: EuiSwitchEvent) => {
    return this.onFieldChange(e.target.checked);
  };

  onFieldChangeEvent = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    this.onFieldChange(e.target.value);

  onFieldChange = (value: any) => {
    const { type, validation } = this.props.setting;
    const { unsavedValue } = this.state;

    let newUnsavedValue;

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
    let error = null;

    if (validation && (validation as StringValidationRegex).regex) {
      if (!(validation as StringValidationRegex).regex!.test(newUnsavedValue.toString())) {
        error = (validation as StringValidationRegex).message;
        isInvalid = true;
      }
    }

    this.setState({
      unsavedValue: newUnsavedValue,
      isInvalid,
      error,
    });
  };

  onFieldKeyDown = ({ keyCode }: { keyCode: number }) => {
    if (keyCode === keyCodes.ENTER) {
      this.saveEdit();
    }
    if (keyCode === keyCodes.ESCAPE) {
      this.cancelEdit();
    }
  };

  onFieldEscape = ({ keyCode }: { keyCode: number }) => {
    if (keyCode === keyCodes.ESCAPE) {
      this.cancelEdit();
    }
  };

  onImageChange = async (files: any[]) => {
    if (!files.length) {
      this.clearError();
      this.setState({
        unsavedValue: null,
      });
      return;
    }

    const file = files[0];
    const { maxSize } = this.props.setting.validation as ImageValidation;
    try {
      let base64Image = '';
      if (file instanceof File) {
        base64Image = (await this.getImageAsBase64(file)) as string;
      }
      const isInvalid = !!(maxSize && maxSize.length && base64Image.length > maxSize.length);
      this.setState({
        isInvalid,
        error: isInvalid
          ? i18n.translate('advancedSettings.field.imageTooLargeErrorMessage', {
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
      this.props.toasts.addDanger(
        i18n.translate('advancedSettings.field.imageChangeErrorMessage', {
          defaultMessage: 'Image could not be saved',
        })
      );
      this.cancelChangeImage();
    }
  };

  async getImageAsBase64(file: Blob): Promise<string | ArrayBuffer> {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    return new Promise((resolve, reject) => {
      reader.onload = () => {
        resolve(reader.result || undefined);
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
      this.props.toasts.add({
        title: i18n.translate('advancedSettings.field.requiresPageReloadToastDescription', {
          defaultMessage: 'Please reload the page for the "{settingName}" setting to take effect.',
          values: {
            settingName: this.props.setting.displayName || this.props.setting.name,
          },
        }),
        text: element => {
          const content = (
            <>
              <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButton size="s" onClick={() => window.location.reload()}>
                    {i18n.translate('advancedSettings.field.requiresPageReloadToastButtonLabel', {
                      defaultMessage: 'Reload page',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          );
          ReactDOM.render(content, element);
          return () => ReactDOM.unmountComponentAtNode(element);
        },
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
        valueToSave = valueToSave.split(',').map((val: string) => val.trim());
        isSameValue = valueToSave.join(',') === (defVal as string[]).join(',');
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
      this.props.toasts.addDanger(
        i18n.translate('advancedSettings.field.saveFieldErrorMessage', {
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
      this.props.toasts.addDanger(
        i18n.translate('advancedSettings.field.resetFieldErrorMessage', {
          defaultMessage: 'Unable to reset {name}',
          values: { name },
        })
      );
    }
    this.setLoading(false);
  };

  renderField(setting: FieldSetting) {
    const { enableSaving } = this.props;
    const { loading, changeImage, unsavedValue } = this.state;
    const { name, value, type, options, optionLabels = {}, isOverridden, ariaName } = setting;

    switch (type) {
      case 'boolean':
        return (
          <EuiSwitch
            label={
              !!unsavedValue ? (
                <FormattedMessage id="advancedSettings.field.onLabel" defaultMessage="On" />
              ) : (
                <FormattedMessage id="advancedSettings.field.offLabel" defaultMessage="Off" />
              )
            }
            checked={!!unsavedValue}
            onChange={this.onFieldChangeSwitch}
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
          return (
            <EuiImage aria-label={ariaName} allowFullScreen url={value as string} alt={name} />
          );
        } else {
          return (
            <EuiFilePicker
              disabled={loading || isOverridden || !enableSaving}
              onChange={this.onImageChange}
              accept=".jpg,.jpeg,.png"
              ref={(input: HTMLInputElement) => {
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
            options={(options as string[]).map(option => {
              return {
                text: optionLabels.hasOwnProperty(option) ? optionLabels[option] : option,
                value: option,
              };
            })}
            onChange={this.onFieldChangeEvent}
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
            onChange={this.onFieldChangeEvent}
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
            onChange={this.onFieldChangeEvent}
            isLoading={loading}
            disabled={loading || isOverridden || !enableSaving}
            onKeyDown={this.onFieldKeyDown}
            data-test-subj={`advancedSetting-editField-${name}`}
          />
        );
    }
  }

  renderLabel(setting: FieldSetting) {
    return setting.name;
  }

  renderHelpText(setting: FieldSetting) {
    if (setting.isOverridden) {
      return (
        <EuiText size="xs">
          <FormattedMessage
            id="advancedSettings.field.helpText"
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

  renderTitle(setting: FieldSetting) {
    return (
      <h3>
        {setting.displayName || setting.name}
        {setting.isCustom ? (
          <EuiIconTip
            type="asterisk"
            color="primary"
            aria-label={i18n.translate('advancedSettings.field.customSettingAriaLabel', {
              defaultMessage: 'Custom setting',
            })}
            content={
              <FormattedMessage
                id="advancedSettings.field.customSettingTooltip"
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

  renderDescription(setting: FieldSetting) {
    let description;
    let deprecation;

    if (setting.deprecation) {
      const links = this.props.dockLinks;

      deprecation = (
        <>
          <EuiToolTip content={setting.deprecation.message}>
            <EuiBadge
              color="warning"
              onClick={() => {
                window.open(links.management[setting.deprecation!.docLinksKey], '_blank');
              }}
              onClickAriaLabel={i18n.translate('advancedSettings.field.deprecationClickAreaLabel', {
                defaultMessage: 'Click to view deprecation documentation for {settingName}.',
                values: {
                  settingName: setting.name,
                },
              })}
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
          dangerouslySetInnerHTML={{ __html: setting.description || '' }} // eslint-disable-line react/no-danger
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

  renderDefaultValue(setting: FieldSetting) {
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
                id="advancedSettings.field.defaultValueTypeJsonText"
                defaultMessage="Default: {value}"
                values={{
                  value: (
                    <EuiCodeBlock
                      language="json"
                      paddingSize="s"
                      overflowHeight={(defVal as string).length >= 500 ? 300 : undefined}
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
                id="advancedSettings.field.defaultValueText"
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

  renderResetToDefaultLink(setting: FieldSetting) {
    const { ariaName, name } = setting;
    if (isDefaultValue(setting)) {
      return;
    }
    return (
      <span>
        <EuiLink
          aria-label={i18n.translate('advancedSettings.field.resetToDefaultLinkAriaLabel', {
            defaultMessage: 'Reset {ariaName} to default',
            values: {
              ariaName,
            },
          })}
          onClick={this.resetField}
          data-test-subj={`advancedSetting-resetField-${name}`}
        >
          <FormattedMessage
            id="advancedSettings.field.resetToDefaultLinkText"
            defaultMessage="Reset to default"
          />
        </EuiLink>
        &nbsp;&nbsp;&nbsp;
      </span>
    );
  }

  renderChangeImageLink(setting: FieldSetting) {
    const { changeImage } = this.state;
    const { type, value, ariaName, name } = setting;
    if (type !== 'image' || !value || changeImage) {
      return;
    }
    return (
      <span>
        <EuiLink
          aria-label={i18n.translate('advancedSettings.field.changeImageLinkAriaLabel', {
            defaultMessage: 'Change {ariaName}',
            values: {
              ariaName,
            },
          })}
          onClick={this.changeImage}
          data-test-subj={`advancedSetting-changeImage-${name}`}
        >
          <FormattedMessage
            id="advancedSettings.field.changeImageLinkText"
            defaultMessage="Change image"
          />
        </EuiLink>
      </span>
    );
  }

  renderActions(setting: FieldSetting) {
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
              aria-label={i18n.translate('advancedSettings.field.saveButtonAriaLabel', {
                defaultMessage: 'Save {ariaName}',
                values: {
                  ariaName,
                },
              })}
              onClick={this.saveEdit}
              disabled={isDisabled || isInvalid}
              data-test-subj={`advancedSetting-saveEditField-${name}`}
            >
              <FormattedMessage id="advancedSettings.field.saveButtonLabel" defaultMessage="Save" />
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              aria-label={i18n.translate('advancedSettings.field.cancelEditingButtonAriaLabel', {
                defaultMessage: 'Cancel editing {ariaName}',
                values: {
                  ariaName,
                },
              })}
              onClick={() => (changeImage ? this.cancelChangeImage() : this.cancelEdit())}
              disabled={isDisabled}
              data-test-subj={`advancedSetting-cancelEditField-${name}`}
            >
              <FormattedMessage
                id="advancedSettings.field.cancelEditingButtonLabel"
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
