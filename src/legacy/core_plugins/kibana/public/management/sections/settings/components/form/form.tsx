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
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiBottomBar,
  EuiButton,
  EuiToolTip,
  EuiButtonEmpty,
} from '@elastic/eui';
import { toastNotifications } from 'ui/notify';
import { FormattedMessage } from '@kbn/i18n/react';
import { isEmpty } from 'lodash';
import intersectionBy from 'lodash.intersectionby';
import { i18n } from '@kbn/i18n';

import { getCategoryName } from '../../lib';
import { Field, getEditableValue } from '../field';
import { FieldSetting, SettingsChanges, FormState, FieldState } from '../../types';

type Category = string;

interface FormProps {
  settings: Record<string, FieldSetting[]>;
  categories: Category[];
  categoryCounts: Record<string, number>;
  clearQuery: () => void;
  save: (changes: SettingsChanges) => Promise<boolean[]>;
  showNoResultsMessage: boolean;
  enableSaving: boolean;
}

export class Form extends PureComponent<FormProps> {
  state: FormState = {
    unsavedChanges: {},
    loading: false,
  };

  setLoading(loading: boolean) {
    this.setState({
      loading,
    });
  }

  getSettingByKey = (key: string): FieldSetting | undefined => {
    return Object.values(this.props.settings)
      .flat()
      .find(el => el.name === key);
  };

  getCountOfUnsavedSettings = (): number => {
    return Object.keys(this.state.unsavedChanges).length;
  };

  getCountOfHiddenUnsavedSettings = (): number => {
    const unsavedSettings = Object.keys(this.state.unsavedChanges).map(key => ({ name: key }));
    const displayedUnsavedCount = intersectionBy(
      unsavedSettings,
      Object.values(this.props.settings).flat(),
      'name'
    ).length;
    return unsavedSettings.length - displayedUnsavedCount;
  };

  areChangesValid = (): boolean => {
    const { unsavedChanges } = this.state;
    return Object.values(unsavedChanges).some(({ isInvalid }) => isInvalid === true);
  };

  handleChange = (key: string, change: FieldState) => {
    const setting = this.getSettingByKey(key);
    if (!setting) {
      return;
    }
    const { type, defVal, value } = setting;
    const savedValue = getEditableValue(type, value, defVal);
    if (change.value === savedValue) {
      return this.clearChange(key);
    }
    this.setState({
      unsavedChanges: {
        ...this.state.unsavedChanges,
        [key]: change,
      },
    });
  };

  clearChange = (key: string) => {
    if (!this.state.unsavedChanges[key]) {
      return;
    }
    const unsavedChanges = { ...this.state.unsavedChanges };
    delete unsavedChanges[key];

    this.setState({
      unsavedChanges,
    });
  };

  clearUnsaved = () => {
    this.setState({ unsavedChanges: {} });
  };

  saveAll = async () => {
    this.setLoading(true);
    const { unsavedChanges } = this.state;

    if (isEmpty(unsavedChanges)) {
      return;
    }
    const configToSave: SettingsChanges = {};
    let requiresReload = false;

    Object.entries(unsavedChanges).forEach(([name, { value }]) => {
      const setting = this.getSettingByKey(name);
      if (!setting) {
        return;
      }
      const { defVal, type, requiresPageReload } = setting;
      let valueToSave = value;
      let equalsToDefault = false;
      switch (type) {
        case 'array':
          valueToSave = valueToSave.split(',').map((val: string) => val.trim());
          equalsToDefault = valueToSave.join(',') === (defVal as string[]).join(',');
          break;
        case 'json':
          const isArray = Array.isArray(JSON.parse((defVal as string) || '{}'));
          valueToSave = valueToSave.trim();
          valueToSave = valueToSave || (isArray ? '[]' : '{}');
        default:
          equalsToDefault = valueToSave === defVal;
      }
      if (requiresPageReload) {
        requiresReload = true;
      }
      configToSave[name] = equalsToDefault ? null : valueToSave;
    });

    try {
      await this.props.save(configToSave);
      this.clearUnsaved();
      if (requiresReload) {
        this.renderPageReloadToast();
      }
    } catch (e) {
      toastNotifications.addDanger(
        i18n.translate('kbn.management.settings.form.saveErrorMessage', {
          defaultMessage: 'Unable to save',
        })
      );
    }
    this.setLoading(false);
  };

  renderPageReloadToast = () => {
    toastNotifications.add({
      title: i18n.translate('kbn.management.settings.field.requiresPageReloadToastDescription', {
        defaultMessage: 'One or more of the saved settings requires a page reload to take effect',
      }),
      text: element => {
        const content = (
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
        );
        ReactDOM.render(content, element);
        return () => ReactDOM.unmountComponentAtNode(element);
      },
      color: 'success',
    });
  };

  renderClearQueryLink(totalSettings: number, currentSettings: number) {
    const { clearQuery } = this.props;

    if (totalSettings !== currentSettings) {
      return (
        <EuiFlexItem grow={false}>
          <em>
            <FormattedMessage
              id="kbn.management.settings.form.searchResultText"
              defaultMessage="Search terms are hiding {settingsCount} settings {clearSearch}"
              values={{
                settingsCount: totalSettings - currentSettings,
                clearSearch: (
                  <EuiLink onClick={clearQuery}>
                    <em>
                      <FormattedMessage
                        id="kbn.management.settings.form.clearSearchResultText"
                        defaultMessage="(clear search)"
                      />
                    </em>
                  </EuiLink>
                ),
              }}
            />
          </em>
        </EuiFlexItem>
      );
    }

    return null;
  }

  renderCategory(category: Category, settings: FieldSetting[], totalSettings: number) {
    return (
      <Fragment key={category}>
        <EuiPanel paddingSize="l">
          <EuiForm>
            <EuiText>
              <EuiFlexGroup alignItems="baseline">
                <EuiFlexItem grow={false}>
                  <h2>{getCategoryName(category)}</h2>
                </EuiFlexItem>
                {this.renderClearQueryLink(totalSettings, settings.length)}
              </EuiFlexGroup>
            </EuiText>
            <EuiSpacer size="m" />
            {settings.map(setting => {
              return (
                <Field
                  key={setting.name}
                  setting={setting}
                  handleChange={this.handleChange}
                  unsavedChanges={this.state.unsavedChanges[setting.name]}
                  clearChange={this.clearChange}
                  enableSaving={this.props.enableSaving}
                />
              );
            })}
          </EuiForm>
        </EuiPanel>
        <EuiSpacer size="l" />
      </Fragment>
    );
  }

  maybeRenderNoSettings(clearQuery: FormProps['clearQuery']) {
    if (this.props.showNoResultsMessage) {
      return (
        <EuiPanel paddingSize="l">
          <FormattedMessage
            id="kbn.management.settings.form.noSearchResultText"
            defaultMessage="No settings found {clearSearch}"
            values={{
              clearSearch: (
                <EuiLink onClick={clearQuery}>
                  <FormattedMessage
                    id="kbn.management.settings.form.clearNoSearchResultText"
                    defaultMessage="(clear search)"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiPanel>
      );
    }
    return null;
  }

  renderBottomBar = () => {
    const unsavedCount = this.getCountOfUnsavedSettings();
    const hiddenUnsavedCount = this.getCountOfHiddenUnsavedSettings();
    return (
      <EuiBottomBar>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTextColor className="mgtAdvancedSettingsForm__unsavedCount" color="ghost">
              <FormattedMessage
                id="kbn.management.settings.form.countOfSettingsChanged"
                defaultMessage="{settingsCount} {hiddenCountCopy} unsaved settings"
                values={{
                  settingsCount: unsavedCount,
                  hiddenCountCopy: hiddenUnsavedCount ? (
                    <FormattedMessage
                      id="kbn.management.settings.form.countOfSettingsHiddenChanged"
                      defaultMessage="({hiddenCount} hidden)"
                      values={{
                        hiddenCount: hiddenUnsavedCount,
                      }}
                    />
                  ) : (
                    ''
                  ),
                }}
              />
            </EuiTextColor>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  color="ghost"
                  size="s"
                  iconType="cross"
                  onClick={this.clearUnsaved}
                  aria-label={i18n.translate('kbn.management.settings.form.cancelButtonAriaLabel', {
                    defaultMessage: 'Cancel all changes',
                  })}
                >
                  Cancel all changes
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={
                    this.areChangesValid() &&
                    i18n.translate(
                      'kbn.management.settings.field.saveButtonTooltipWithInvalidChanges',
                      {
                        defaultMessage: 'You must fix all invalid settings before saving.',
                      }
                    )
                  }
                >
                  <EuiButton
                    disabled={this.areChangesValid()}
                    color="secondary"
                    fill
                    size="s"
                    iconType="check"
                    onClick={this.saveAll}
                    aria-label={i18n.translate('kbn.management.settings.form.saveButtonAriaLabel', {
                      defaultMessage: 'Save changes',
                    })}
                    isLoading={this.state.loading}
                  >
                    Save changes
                  </EuiButton>
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiBottomBar>
    );
  };

  render() {
    const { unsavedChanges } = this.state;
    const { settings, categories, categoryCounts, clearQuery } = this.props;
    const currentCategories: Category[] = [];

    categories.forEach(category => {
      if (settings[category] && settings[category].length) {
        currentCategories.push(category);
      }
    });

    return (
      <Fragment>
        <div>
          {currentCategories.length
            ? currentCategories.map(category => {
                return this.renderCategory(category, settings[category], categoryCounts[category]);
              })
            : this.maybeRenderNoSettings(clearQuery)}
        </div>
        {!isEmpty(unsavedChanges) && this.renderBottomBar()}
      </Fragment>
    );
  }
}
