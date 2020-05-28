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
import { FormattedMessage } from '@kbn/i18n/react';
import { isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '../../../../../kibana_react/public';
import { DocLinksStart, ToastsStart } from '../../../../../../core/public';

import { getCategoryName } from '../../lib';
import { Field, getEditableValue } from '../field';
import { FieldSetting, SettingsChanges, FieldState } from '../../types';

type Category = string;
const NAV_IS_LOCKED_KEY = 'core.chrome.isLocked';

interface FormProps {
  settings: Record<string, FieldSetting[]>;
  visibleSettings: Record<string, FieldSetting[]>;
  categories: Category[];
  categoryCounts: Record<string, number>;
  clearQuery: () => void;
  save: (changes: SettingsChanges) => Promise<boolean[]>;
  showNoResultsMessage: boolean;
  enableSaving: boolean;
  dockLinks: DocLinksStart['links'];
  toasts: ToastsStart;
}

interface FormState {
  unsavedChanges: {
    [key: string]: FieldState;
  };
  loading: boolean;
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
      .find((el) => el.name === key);
  };

  getCountOfUnsavedChanges = (): number => {
    return Object.keys(this.state.unsavedChanges).length;
  };

  getCountOfHiddenUnsavedChanges = (): number => {
    const shownSettings = Object.values(this.props.visibleSettings)
      .flat()
      .map((setting) => setting.name);
    return Object.keys(this.state.unsavedChanges).filter((key) => !shownSettings.includes(key))
      .length;
  };

  areChangesInvalid = (): boolean => {
    const { unsavedChanges } = this.state;
    return Object.values(unsavedChanges).some(({ isInvalid }) => isInvalid);
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

  clearAllUnsaved = () => {
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
      this.clearAllUnsaved();
      if (requiresReload) {
        this.renderPageReloadToast();
      }
    } catch (e) {
      this.props.toasts.addDanger(
        i18n.translate('advancedSettings.form.saveErrorMessage', {
          defaultMessage: 'Unable to save',
        })
      );
    }
    this.setLoading(false);
  };

  renderPageReloadToast = () => {
    this.props.toasts.add({
      title: i18n.translate('advancedSettings.form.requiresPageReloadToastDescription', {
        defaultMessage: 'One or more settings require you to reload the page to take effect.',
      }),
      text: toMountPoint(
        <>
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButton size="s" onClick={() => window.location.reload()}>
                {i18n.translate('advancedSettings.form.requiresPageReloadToastButtonLabel', {
                  defaultMessage: 'Reload page',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ),
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
              id="advancedSettings.form.searchResultText"
              defaultMessage="Search terms are hiding {settingsCount} settings {clearSearch}"
              values={{
                settingsCount: totalSettings - currentSettings,
                clearSearch: (
                  <EuiLink onClick={clearQuery}>
                    <em>
                      <FormattedMessage
                        id="advancedSettings.form.clearSearchResultText"
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
            {settings.map((setting) => {
              return (
                <Field
                  key={setting.name}
                  setting={setting}
                  handleChange={this.handleChange}
                  unsavedChanges={this.state.unsavedChanges[setting.name]}
                  clearChange={this.clearChange}
                  enableSaving={this.props.enableSaving}
                  dockLinks={this.props.dockLinks}
                  toasts={this.props.toasts}
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
            id="advancedSettings.form.noSearchResultText"
            defaultMessage="No settings found {clearSearch}"
            values={{
              clearSearch: (
                <EuiLink onClick={clearQuery}>
                  <FormattedMessage
                    id="advancedSettings.form.clearNoSearchResultText"
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

  renderCountOfUnsaved = () => {
    const unsavedCount = this.getCountOfUnsavedChanges();
    const hiddenUnsavedCount = this.getCountOfHiddenUnsavedChanges();
    return (
      <EuiTextColor className="mgtAdvancedSettingsForm__unsavedCountMessage" color="ghost">
        <FormattedMessage
          id="advancedSettings.form.countOfSettingsChanged"
          defaultMessage="{unsavedCount} unsaved {unsavedCount, plural,
              one {setting}
              other {settings}
            }{hiddenCount, plural,
              =0 {}
              other {, # hidden}
            }"
          values={{
            unsavedCount,
            hiddenCount: hiddenUnsavedCount,
          }}
        />
      </EuiTextColor>
    );
  };

  renderBottomBar = () => {
    const areChangesInvalid = this.areChangesInvalid();

    // TODO #64541
    // Delete these classes
    let bottomBarClasses = '';
    const pageNav = this.props.settings.general.find(
      (setting) => setting.name === 'pageNavigation'
    );

    if (pageNav?.value === 'legacy') {
      bottomBarClasses = classNames('mgtAdvancedSettingsForm__bottomBar', {
        'mgtAdvancedSettingsForm__bottomBar--pushForNav':
          localStorage.getItem(NAV_IS_LOCKED_KEY) === 'true',
      });
    }
    return (
      <EuiBottomBar className={bottomBarClasses} data-test-subj="advancedSetting-bottomBar">
        <EuiFlexGroup
          justifyContent="spaceBetween"
          alignItems="center"
          responsive={false}
          gutterSize="s"
        >
          <EuiFlexItem grow={false} className="mgtAdvancedSettingsForm__unsavedCount">
            <p id="aria-describedby.countOfUnsavedSettings">{this.renderCountOfUnsaved()}</p>
          </EuiFlexItem>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              color="ghost"
              size="s"
              iconType="cross"
              onClick={this.clearAllUnsaved}
              aria-describedby="aria-describedby.countOfUnsavedSettings"
              data-test-subj="advancedSetting-cancelButton"
            >
              {i18n.translate('advancedSettings.form.cancelButtonLabel', {
                defaultMessage: 'Cancel changes',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={
                areChangesInvalid &&
                i18n.translate('advancedSettings.form.saveButtonTooltipWithInvalidChanges', {
                  defaultMessage: 'Fix invalid settings before saving.',
                })
              }
            >
              <EuiButton
                className="mgtAdvancedSettingsForm__button"
                disabled={areChangesInvalid}
                color="secondary"
                fill
                size="s"
                iconType="check"
                onClick={this.saveAll}
                aria-describedby="aria-describedby.countOfUnsavedSettings"
                isLoading={this.state.loading}
                data-test-subj="advancedSetting-saveButton"
              >
                {i18n.translate('advancedSettings.form.saveButtonLabel', {
                  defaultMessage: 'Save changes',
                })}
              </EuiButton>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiBottomBar>
    );
  };

  render() {
    const { unsavedChanges } = this.state;
    const { visibleSettings, categories, categoryCounts, clearQuery } = this.props;
    const currentCategories: Category[] = [];

    categories.forEach((category) => {
      if (visibleSettings[category] && visibleSettings[category].length) {
        currentCategories.push(category);
      }
    });

    return (
      <Fragment>
        <div>
          {currentCategories.length
            ? currentCategories.map((category) => {
                return this.renderCategory(
                  category,
                  visibleSettings[category],
                  categoryCounts[category]
                );
              })
            : this.maybeRenderNoSettings(clearQuery)}
        </div>
        {!isEmpty(unsavedChanges) && this.renderBottomBar()}
      </Fragment>
    );
  }
}
