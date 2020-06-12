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
import classNames from 'classnames';

import 'brace/theme/textmate';
import 'brace/mode/markdown';

import {
  EuiBadge,
  EuiCode,
  EuiCodeBlock,
  EuiScreenReaderOnly,
  // @ts-ignore
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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { FieldSetting, FieldState } from '../../types';
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
  handleChange: (name: string, value: FieldState) => void;
  enableSaving: boolean;
  dockLinks: DocLinksStart['links'];
  toasts: ToastsStart;
  clearChange?: (name: string) => void;
  unsavedChanges?: FieldState;
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
  private changeImageForm = React.createRef<EuiFilePicker>();

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

  onCodeEditorChange = (value: string) => {
    const { defVal, type } = this.props.setting;

    let newUnsavedValue;
    let errorParams = {};

    switch (type) {
      case 'json':
        const isJsonArray = Array.isArray(JSON.parse((defVal as string) || '{}'));
        newUnsavedValue = value.trim() || (isJsonArray ? '[]' : '{}');
        try {
          JSON.parse(newUnsavedValue);
        } catch (e) {
          errorParams = {
            error: i18n.translate('advancedSettings.field.codeEditorSyntaxErrorMessage', {
              defaultMessage: 'Invalid JSON syntax',
            }),
            isInvalid: true,
          };
        }
        break;
      default:
        newUnsavedValue = value;
    }

    this.handleChange({
      value: newUnsavedValue,
      ...errorParams,
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

    let errorParams = {};

    if ((validation as StringValidationRegex)?.regex) {
      if (!(validation as StringValidationRegex).regex!.test(newUnsavedValue.toString())) {
        errorParams = {
          error: (validation as StringValidationRegex).message,
          isInvalid: true,
        };
      }
    }

    this.handleChange({
      value: newUnsavedValue,
      ...errorParams,
    });
  };

  onImageChange = async (files: FileList | null) => {
    if (files == null) return;

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

      let errorParams = {};
      const isInvalid = !!(maxSize?.length && base64Image.length > maxSize.length);
      if (isInvalid) {
        errorParams = {
          isInvalid,
          error: i18n.translate('advancedSettings.field.imageTooLargeErrorMessage', {
            defaultMessage: 'Image is too large, maximum size is {maxSizeDescription}',
            values: {
              maxSizeDescription: maxSize.description,
            },
          }),
        };
      }
      this.handleChange({
        changeImage: true,
        value: base64Image,
        ...errorParams,
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
      reader.onerror = (err) => {
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
    if (this.changeImageForm.current?.fileInput) {
      this.changeImageForm.current.fileInput.value = '';
      this.changeImageForm.current.handleChange();
    }
    if (this.props.clearChange) {
      this.props.clearChange(this.props.setting.name);
    }
  };

  renderField(id: string, setting: FieldSetting) {
    const { enableSaving, unsavedChanges, loading } = this.props;
    const {
      name,
      value,
      type,
      options,
      optionLabels = {},
      isOverridden,
      defVal,
      ariaName,
    } = setting;
    const a11yProps: { [key: string]: string } = unsavedChanges
      ? {
          'aria-label': ariaName,
          'aria-describedby': id,
        }
      : {
          'aria-label': ariaName,
        };
    const currentValue = unsavedChanges
      ? unsavedChanges.value
      : getEditableValue(type, value, defVal);

    switch (type) {
      case 'boolean':
        return (
          <EuiSwitch
            label={
              !!currentValue ? (
                <FormattedMessage id="advancedSettings.field.onLabel" defaultMessage="On" />
              ) : (
                <FormattedMessage id="advancedSettings.field.offLabel" defaultMessage="Off" />
              )
            }
            checked={!!currentValue}
            onChange={this.onFieldChangeSwitch}
            disabled={loading || isOverridden || !enableSaving}
            data-test-subj={`advancedSetting-editField-${name}`}
            {...a11yProps}
          />
        );
      case 'markdown':
      case 'json':
        return (
          <div data-test-subj={`advancedSetting-editField-${name}`}>
            <EuiCodeEditor
              {...a11yProps}
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
            />
          </div>
        );
      case 'image':
        const changeImage = unsavedChanges?.changeImage;
        if (!isDefaultValue(setting) && !changeImage) {
          return <EuiImage {...a11yProps} allowFullScreen url={value as string} alt={name} />;
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
            {...a11yProps}
            value={currentValue}
            options={(options as string[]).map((option) => {
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
            {...a11yProps}
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
            {...a11yProps}
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
    const { unsavedChanges } = this.props;
    const isInvalid = unsavedChanges?.isInvalid;

    const unsavedIconLabel = unsavedChanges
      ? isInvalid
        ? i18n.translate('advancedSettings.field.invalidIconLabel', {
            defaultMessage: 'Invalid',
          })
        : i18n.translate('advancedSettings.field.unsavedIconLabel', {
            defaultMessage: 'Unsaved',
          })
      : undefined;

    return (
      <h3>
        <span className="mgtAdvancedSettings__fieldTitle">
          {setting.displayName || setting.name}
        </span>
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

        {unsavedChanges ? (
          <EuiIconTip
            anchorClassName="mgtAdvancedSettings__fieldTitleUnsavedIcon"
            type={isInvalid ? 'alert' : 'dot'}
            color={isInvalid ? 'danger' : 'warning'}
            aria-label={unsavedIconLabel}
            content={unsavedIconLabel}
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
    const changeImage = this.props.unsavedChanges?.changeImage;
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

  render() {
    const { setting, unsavedChanges } = this.props;
    const error = unsavedChanges?.error;
    const isInvalid = unsavedChanges?.isInvalid;

    const className = classNames('mgtAdvancedSettings__field', {
      'mgtAdvancedSettings__field--unsaved': unsavedChanges,
      'mgtAdvancedSettings__field--invalid': isInvalid,
    });
    const id = setting.name;

    return (
      <EuiDescribedFormGroup
        className={className}
        title={this.renderTitle(setting)}
        description={this.renderDescription(setting)}
        fullWidth
      >
        <EuiFormRow
          isInvalid={isInvalid}
          error={error}
          label={this.renderLabel(setting)}
          helpText={this.renderHelpText(setting)}
          className="mgtAdvancedSettings__fieldRow"
          hasChildLabel={setting.type !== 'boolean'}
          fullWidth
        >
          <>
            {this.renderField(id, setting)}
            {unsavedChanges && (
              <EuiScreenReaderOnly>
                <p id={id}>
                  {unsavedChanges.error
                    ? unsavedChanges.error
                    : i18n.translate('advancedSettings.field.settingIsUnsaved', {
                        defaultMessage: 'Setting is currently not saved.',
                      })}
                </p>
              </EuiScreenReaderOnly>
            )}
          </>
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  }
}
