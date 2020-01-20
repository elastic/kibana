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
import { npStart } from 'ui/new_platform';
import classNames from 'classnames';

import 'brace/theme/textmate';
import 'brace/mode/markdown';

import { toastNotifications } from 'ui/notify';
import {
  EuiBadge,
  EuiCode,
  EuiCodeBlock,
  EuiCodeEditor,
  EuiDescribedFormGroup,
  EuiFieldNumber,
  EuiFieldText,
  // @ts-ignore
  EuiFilePicker,
  EuiFormRow,
  EuiIconTip,
  EuiImage,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiSelect,
  EuiSwitch,
  EuiSwitchEvent,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { FieldSetting, FieldState } from '../../types';
import { isDefaultValue } from '../../lib';
import {
  UiSettingsType,
  ImageValidation,
  StringValidationRegex,
} from '../../../../../../../../../core/public';

interface FieldProps {
  setting: FieldSetting;
  handleChange: (name: string, value: FieldState) => void;
  clearChange: (name: string) => void;
  enableSaving: boolean;
  unsavedChanges: FieldState;
  loading?: boolean;
}

export const getEditableValue = (
  type: UiSettingsType,
  value: FieldSetting['value'],
  defVal?: FieldSetting['defVal']
) => {
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
};

export class Field extends PureComponent<FieldProps> {
  private changeImageForm: EuiFilePicker | undefined = React.createRef();

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

  handleChange = (unsavedChanges: FieldState) => {
    this.props.handleChange(this.props.setting.name, unsavedChanges);
  };

  resetField = () => {
    const { type, defVal } = this.props.setting;
    if (type === 'image') {
      this.cancelChangeImage();
      return this.handleChange({
        value: getEditableValue(type, defVal),
        changeImage: true,
      });
    }
    return this.handleChange({ value: getEditableValue(type, defVal) });
  };

  componentDidUpdate(prevProps: FieldProps) {
    if (
      prevProps.setting.type === 'image' &&
      prevProps.unsavedChanges?.value &&
      !this.props.unsavedChanges?.value
    ) {
      this.cancelChangeImage();
    }
  }

  onCodeEditorChange = (value: UiSettingsType) => {
    const { defVal, type } = this.props.setting;

    let newUnsavedValue;
    let isInvalid = false;
    let error = null;

    switch (type) {
      case 'json':
        const isJsonArray = Array.isArray(JSON.parse((defVal as string) || '{}'));
        newUnsavedValue = value.trim() || (isJsonArray ? '[]' : '{}');
        try {
          JSON.parse(newUnsavedValue);
        } catch (e) {
          isInvalid = true;
          error = i18n.translate('kbn.management.settings.field.codeEditorSyntaxErrorMessage', {
            defaultMessage: 'Invalid JSON syntax',
          });
        }
        break;
      default:
        newUnsavedValue = value;
    }

    this.handleChange({
      value: newUnsavedValue,
      error,
      isInvalid,
    });
  };

  onFieldChangeSwitch = (e: EuiSwitchEvent) => {
    return this.onFieldChange(e.target.checked);
  };

  onFieldChangeEvent = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    this.onFieldChange(e.target.value);

  onFieldChange = (targetValue: any) => {
    const { type, validation, value, defVal } = this.props.setting;
    let newUnsavedValue;

    switch (type) {
      case 'boolean':
        const { unsavedChanges } = this.props;
        const currentValue = unsavedChanges
          ? unsavedChanges.value
          : getEditableValue(type, value, defVal);
        newUnsavedValue = !currentValue;
        break;
      case 'number':
        newUnsavedValue = Number(targetValue);
        break;
      default:
        newUnsavedValue = targetValue;
    }

    let isInvalid = false;
    let error = null;

    if (validation && (validation as StringValidationRegex).regex) {
      if (!(validation as StringValidationRegex).regex!.test(newUnsavedValue.toString())) {
        error = (validation as StringValidationRegex).message;
        isInvalid = true;
      }
    }

    this.handleChange({
      value: newUnsavedValue,
      isInvalid,
      error,
    });
  };

  onImageChange = async (files: any[]) => {
    if (!files.length) {
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

      const isInvalid = !!(maxSize?.length && base64Image.length > maxSize.length);
      this.handleChange({
        changeImage: true,
        value: base64Image,

        isInvalid,
        error: isInvalid
          ? i18n.translate('kbn.management.settings.field.imageTooLargeErrorMessage', {
              defaultMessage: 'Image is too large, maximum size is {maxSizeDescription}',
              values: {
                maxSizeDescription: maxSize.description,
              },
            })
          : null,
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
    this.handleChange({
      value: null,
      changeImage: true,
    });
  };

  cancelChangeImage = () => {
    if (this.changeImageForm.current) {
      this.changeImageForm.current.fileInput.value = null;
      this.changeImageForm.current.handleChange({});
    }

    this.props.clearChange(this.props.setting.name);
  };

  renderField(setting: FieldSetting) {
    const { enableSaving, unsavedChanges, loading } = this.props;
    const {
      name,
      value,
      type,
      options,
      optionLabels = {},
      isOverridden,
      ariaName,
      defVal,
    } = setting;
    const currentValue = unsavedChanges
      ? unsavedChanges.value
      : getEditableValue(type, value, defVal);

    switch (type) {
      case 'boolean':
        return (
          <EuiSwitch
            label={
              !!currentValue ? (
                <FormattedMessage id="kbn.management.settings.field.onLabel" defaultMessage="On" />
              ) : (
                <FormattedMessage
                  id="kbn.management.settings.field.offLabel"
                  defaultMessage="Off"
                />
              )
            }
            checked={!!currentValue}
            onChange={this.onFieldChangeSwitch}
            disabled={loading || isOverridden || !enableSaving}
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
              value={currentValue}
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
              fullWidth
            />
          </div>
        );
      case 'image':
        const changeImage = unsavedChanges?.changeImage;
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
              ref={this.changeImageForm}
              fullWidth
              data-test-subj={`advancedSetting-editField-${name}`}
            />
          );
        }
      case 'select':
        return (
          <EuiSelect
            aria-label={ariaName}
            value={currentValue}
            options={(options as string[]).map(option => {
              return {
                text: optionLabels.hasOwnProperty(option) ? optionLabels[option] : option,
                value: option,
              };
            })}
            onChange={this.onFieldChangeEvent}
            isLoading={loading}
            disabled={loading || isOverridden || !enableSaving}
            fullWidth
            data-test-subj={`advancedSetting-editField-${name}`}
          />
        );
      case 'number':
        return (
          <EuiFieldNumber
            aria-label={ariaName}
            value={currentValue}
            onChange={this.onFieldChangeEvent}
            isLoading={loading}
            disabled={loading || isOverridden || !enableSaving}
            fullWidth
            data-test-subj={`advancedSetting-editField-${name}`}
          />
        );
      default:
        return (
          <EuiFieldText
            aria-label={ariaName}
            value={currentValue}
            onChange={this.onFieldChangeEvent}
            isLoading={loading}
            disabled={loading || isOverridden || !enableSaving}
            fullWidth
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

  renderTitle(setting: FieldSetting) {
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

  renderDescription(setting: FieldSetting) {
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
                window.open(links.management[setting.deprecation!.docLinksKey], '_blank');
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
                id="kbn.management.settings.field.defaultValueTypeJsonText"
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

  renderResetToDefaultLink(setting: FieldSetting) {
    const { defVal, ariaName, name } = setting;
    if (
      defVal === this.props.unsavedChanges?.value ||
      isDefaultValue(setting) ||
      this.props.loading
    ) {
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

  renderChangeImageLink(setting: FieldSetting) {
    const changeImage = this.props.unsavedChanges?.changeImage;
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

  render() {
    const { setting, unsavedChanges } = this.props;
    const error = unsavedChanges?.error;
    const isInvalid = unsavedChanges?.isInvalid;

    const className = classNames('mgtAdvancedSettings__field', {
      'mgtAdvancedSettings__field--unsaved': unsavedChanges,
      'mgtAdvancedSettings__field--invalid': isInvalid,
    });

    return (
      <EuiFlexGroup className={className}>
        <EuiFlexItem>
          <EuiDescribedFormGroup
            title={this.renderTitle(setting)}
            description={this.renderDescription(setting)}
            idAria={`${setting.name}-aria`}
            fullWidth
          >
            <EuiFormRow
              isInvalid={isInvalid}
              error={error}
              label={this.renderLabel(setting)}
              helpText={this.renderHelpText(setting)}
              describedByIds={[`${setting.name}-aria`]}
              className="mgtAdvancedSettings__fieldRow"
              // @ts-ignore
              hasChildLabel={setting.type !== 'boolean'}
              fullWidth
            >
              {this.renderField(setting)}
            </EuiFormRow>
          </EuiDescribedFormGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
