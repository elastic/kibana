/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { PureComponent, Fragment } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSplitPanel,
  EuiLink,
  EuiCallOut,
  EuiSpacer,
  EuiText,
  EuiBottomBar,
  EuiButton,
  EuiToolTip,
  EuiButtonEmpty,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';
import { UiCounterMetricType } from '@kbn/analytics';
import { KibanaThemeProvider, toMountPoint } from '@kbn/kibana-react-plugin/public';
import { DocLinksStart, ThemeServiceStart, ToastsStart } from '@kbn/core/public';

import { getCategoryName } from '../../lib';
import { Field, getEditableValue } from '../field';
import { FieldSetting, SettingsChanges, FieldState } from '../../types';

type Category = string;

interface FormProps {
  settings: Record<string, FieldSetting[]>;
  visibleSettings: Record<string, FieldSetting[]>;
  categories: Category[];
  categoryCounts: Record<string, number>;
  clearQuery: () => void;
  save: (changes: SettingsChanges) => Promise<boolean[]>;
  showNoResultsMessage: boolean;
  enableSaving: boolean;
  docLinks: DocLinksStart['links'];
  toasts: ToastsStart;
  theme: ThemeServiceStart['theme$'];
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
  queryText?: string;
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
      const { defVal, type, requiresPageReload, metric } = setting;
      let valueToSave = value;
      let equalsToDefault = false;
      switch (type) {
        case 'array':
          valueToSave = valueToSave.trim();
          valueToSave =
            valueToSave === '' ? [] : valueToSave.split(',').map((val: string) => val.trim());
          equalsToDefault = valueToSave.join(',') === (defVal as string[]).join(',');
          break;
        case 'json':
          const isArray = Array.isArray(JSON.parse((defVal as string) || '{}'));
          valueToSave = valueToSave.trim();
          valueToSave = valueToSave || (isArray ? '[]' : '{}');
        case 'boolean':
          if (metric && this.props.trackUiMetric) {
            const metricName = valueToSave ? `${metric.name}_on` : `${metric.name}_off`;
            this.props.trackUiMetric(metric.type, metricName);
          }
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
        <KibanaThemeProvider theme$={this.props.theme}>
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                onClick={() => window.location.reload()}
                data-test-subj="windowReloadButton"
              >
                {i18n.translate('advancedSettings.form.requiresPageReloadToastButtonLabel', {
                  defaultMessage: 'Reload page',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </KibanaThemeProvider>
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
        <EuiSplitPanel.Outer hasBorder>
          <EuiSplitPanel.Inner color="subdued">
            <EuiFlexGroup alignItems="baseline">
              <EuiFlexItem grow={false}>
                <EuiTitle>
                  <h2>{getCategoryName(category)}</h2>
                </EuiTitle>
              </EuiFlexItem>
              {this.renderClearQueryLink(totalSettings, settings.length)}
            </EuiFlexGroup>
          </EuiSplitPanel.Inner>
          <EuiSplitPanel.Inner>
            {settings.map((setting) => {
              return (
                <Field
                  key={setting.name}
                  setting={setting}
                  handleChange={this.handleChange}
                  unsavedChanges={this.state.unsavedChanges[setting.name]}
                  clearChange={this.clearChange}
                  enableSaving={this.props.enableSaving}
                  docLinks={this.props.docLinks}
                  toasts={this.props.toasts}
                />
              );
            })}
          </EuiSplitPanel.Inner>
        </EuiSplitPanel.Outer>
        <EuiSpacer size="l" />
      </Fragment>
    );
  }

  maybeRenderNoSettings(clearQuery: FormProps['clearQuery']) {
    if (this.props.showNoResultsMessage) {
      return (
        <EuiCallOut
          color="danger"
          title={
            <>
              <FormattedMessage
                id="advancedSettings.form.noSearchResultText"
                defaultMessage="No settings found for {queryText} {clearSearch}"
                values={{
                  clearSearch: (
                    <EuiLink onClick={clearQuery}>
                      <FormattedMessage
                        id="advancedSettings.form.clearNoSearchResultText"
                        defaultMessage="(clear search)"
                      />
                    </EuiLink>
                  ),
                  queryText: <strong>{this.props.queryText}</strong>,
                }}
              />
            </>
          }
        />
      );
    }
    return null;
  }

  renderCountOfUnsaved = () => {
    const unsavedCount = this.getCountOfUnsavedChanges();
    const hiddenUnsavedCount = this.getCountOfHiddenUnsavedChanges();
    return (
      <EuiText className="mgtAdvancedSettingsForm__unsavedCountMessage">
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
      </EuiText>
    );
  };

  renderBottomBar = () => {
    const areChangesInvalid = this.areChangesInvalid();
    return (
      <EuiBottomBar data-test-subj="advancedSetting-bottomBar">
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
              color="text"
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
                color="success"
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
    const hasUnsavedChanges = !isEmpty(unsavedChanges);

    if (hasUnsavedChanges) {
      document.body.classList.add('kbnBody--mgtAdvancedSettingsHasBottomBar');
    } else {
      document.body.classList.remove('kbnBody--mgtAdvancedSettingsHasBottomBar');
    }

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
        {hasUnsavedChanges && this.renderBottomBar()}
      </Fragment>
    );
  }
}
