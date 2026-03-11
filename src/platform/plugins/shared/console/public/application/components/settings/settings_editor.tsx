/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { debounce } from 'lodash';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiButton,
  EuiFieldNumber,
  EuiSwitch,
  EuiSuperSelect,
  EuiTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { SettingsGroup } from './settings_group';
import { SettingsFormRow } from './settings_form_row';
import type { DevToolsSettings } from '../../../services';
import type { EsHostService } from '../../lib';
import { normalizeUrl } from '../../../lib/utils';

const styles = {
  minWidthControl: css`
    min-width: 220px;
  `,
};

const DEBOUNCE_DELAY = 500;
const ON_LABEL = i18n.translate('console.settingsPage.onLabel', { defaultMessage: 'On' });
const OFF_LABEL = i18n.translate('console.settingsPage.offLabel', { defaultMessage: 'Off' });

const onceTimeInterval = () =>
  i18n.translate('console.settingsPage.refreshInterval.onceTimeInterval', {
    defaultMessage: 'Once, when console loads',
  });

const everyNMinutesTimeInterval = (value: number) =>
  i18n.translate('console.settingsPage.refreshInterval.everyNMinutesTimeInterval', {
    defaultMessage: 'Every {value} {value, plural, one {minute} other {minutes}}',
    values: { value },
  });

const everyHourTimeInterval = () =>
  i18n.translate('console.settingsPage.refreshInterval.everyHourTimeInterval', {
    defaultMessage: 'Every hour',
  });

const PRESETS_IN_MINUTES = [0, 1, 10, 20, 60];
const intervalOptions = PRESETS_IN_MINUTES.map((value) => ({
  value: (value * 60000).toString(),
  inputDisplay:
    value === 0
      ? onceTimeInterval()
      : value === 60
      ? everyHourTimeInterval()
      : everyNMinutesTimeInterval(value),
}));

export interface Props {
  onSaveSettings: (newSettings: DevToolsSettings) => void;
  refreshAutocompleteSettings: (selectedSettings: DevToolsSettings['autocomplete']) => void;
  settings: DevToolsSettings;
  esHostService: EsHostService;
}

export const SettingsEditor = (props: Props) => {
  const isMounted = useRef(false);

  const [fontSize, setFontSize] = useState(props.settings.fontSize);
  const [wrapMode, setWrapMode] = useState(props.settings.wrapMode);
  const [fields, setFields] = useState(props.settings.autocomplete.fields);
  const [indices, setIndices] = useState(props.settings.autocomplete.indices);
  const [templates, setTemplates] = useState(props.settings.autocomplete.templates);
  const [dataStreams, setDataStreams] = useState(props.settings.autocomplete.dataStreams);
  const [polling, setPolling] = useState(props.settings.polling);
  const [pollInterval, setPollInterval] = useState(props.settings.pollInterval);
  const [tripleQuotes, setTripleQuotes] = useState(props.settings.tripleQuotes);
  const [isHistoryEnabled, setIsHistoryEnabled] = useState(props.settings.isHistoryEnabled);
  const [isKeyboardShortcutsEnabled, setIsKeyboardShortcutsEnabled] = useState(
    props.settings.isKeyboardShortcutsEnabled
  );
  const [isAccessibilityOverlayEnabled, setIsAccessibilityOverlayEnabled] = useState(
    props.settings.isAccessibilityOverlayEnabled
  );
  const [selectedHost, setSelectedHost] = useState(props.settings.selectedHost);
  const [availableHosts, setAvailableHosts] = useState<string[]>([]);

  // Get available hosts from esHostService after it's initialized
  useEffect(() => {
    const loadHosts = async () => {
      if (props.esHostService) {
        await props.esHostService.waitForInitialization();
        const hosts = props.esHostService.getAllHosts();
        setAvailableHosts(hosts);

        const storedHost = props.settings.selectedHost;
        const isStoredHostValid =
          storedHost != null && hosts.some((h) => normalizeUrl(h) === normalizeUrl(storedHost));

        // Reset to first available host if nothing is selected OR if stored host is stale
        if (!isStoredHostValid && hosts.length > 0) {
          setSelectedHost(hosts[0]);
        }
      }
    };

    loadHosts();
  }, [props.esHostService, props.settings.selectedHost]);

  const autoCompleteCheckboxes = [
    {
      id: 'fields',
      label: i18n.translate('console.settingsPage.fieldsLabelText', {
        defaultMessage: 'Fields',
      }),
      stateSetter: setFields,
      checked: fields,
    },
    {
      id: 'indices',
      label: i18n.translate('console.settingsPage.indicesAndAliasesLabelText', {
        defaultMessage: 'Indices and aliases',
      }),
      stateSetter: setIndices,
      checked: indices,
    },
    {
      id: 'templates',
      label: i18n.translate('console.settingsPage.templatesLabelText', {
        defaultMessage: 'Templates',
      }),
      stateSetter: setTemplates,
      checked: templates,
    },
    {
      id: 'dataStreams',
      label: i18n.translate('console.settingsPage.dataStreamsLabelText', {
        defaultMessage: 'Data streams',
      }),
      stateSetter: setDataStreams,
      checked: dataStreams,
    },
  ];

  const saveSettings = () => {
    props.onSaveSettings({
      fontSize,
      wrapMode,
      autocomplete: {
        fields,
        indices,
        templates,
        dataStreams,
      },
      polling,
      pollInterval,
      tripleQuotes,
      isHistoryEnabled,
      isKeyboardShortcutsEnabled,
      isAccessibilityOverlayEnabled,
      selectedHost,
    });
  };
  const debouncedSaveSettings = debounce(saveSettings, DEBOUNCE_DELAY);

  useEffect(() => {
    if (isMounted.current) {
      debouncedSaveSettings();
    } else {
      isMounted.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fontSize,
    wrapMode,
    fields,
    indices,
    templates,
    dataStreams,
    polling,
    pollInterval,
    tripleQuotes,
    isHistoryEnabled,
    isKeyboardShortcutsEnabled,
    isAccessibilityOverlayEnabled,
    selectedHost,
  ]);

  const onPollingIntervalChange = useCallback((value: string) => {
    const sanitizedValue = parseInt(value, 10);

    setPolling(!!sanitizedValue);
    setPollInterval(sanitizedValue);
  }, []);

  const toggleKeyboardShortcuts = useCallback((isEnabled: boolean) => {
    setIsKeyboardShortcutsEnabled(isEnabled);
  }, []);

  const toggleAccessibilityOverlay = useCallback(
    (isEnabled: boolean) => setIsAccessibilityOverlayEnabled(isEnabled),
    []
  );

  const toggleSavingToHistory = useCallback(
    (isEnabled: boolean) => setIsHistoryEnabled(isEnabled),
    []
  );

  return (
    <>
      <EuiTitle>
        <h2>
          <FormattedMessage id="console.settingsPage.pageTitle" defaultMessage="Console settings" />
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText color="subdued">
        <p>
          <FormattedMessage
            id="console.settingsPage.pageDescription"
            defaultMessage="Customize Console to suit your workflow."
          />
        </p>
      </EuiText>

      {/* GENERAL SETTINGS */}
      <SettingsGroup
        title={i18n.translate('console.settingsPage.generalSettingsLabel', {
          defaultMessage: 'General settings',
        })}
      />
      <SettingsFormRow
        label={i18n.translate('console.settingsPage.saveRequestsToHistoryLabel', {
          defaultMessage: 'Save requests to history',
        })}
      >
        <EuiSwitch
          checked={isHistoryEnabled}
          label={isHistoryEnabled ? ON_LABEL : OFF_LABEL}
          onChange={(e) => toggleSavingToHistory(e.target.checked)}
        />
      </SettingsFormRow>
      <SettingsFormRow
        label={i18n.translate('console.settingsPage.enableKeyboardShortcutsLabel', {
          defaultMessage: 'Keyboard shortcuts',
        })}
      >
        <EuiSwitch
          data-test-subj="enableKeyboardShortcuts"
          label={isKeyboardShortcutsEnabled ? ON_LABEL : OFF_LABEL}
          checked={isKeyboardShortcutsEnabled}
          onChange={(e) => toggleKeyboardShortcuts(e.target.checked)}
        />
      </SettingsFormRow>
      <SettingsFormRow
        label={i18n.translate('console.settingsPage.enableAccessibilityOverlayLabel', {
          defaultMessage: 'Accessibility overlay',
        })}
      >
        <EuiSwitch
          data-test-subj="enableA11yOverlay"
          label={isAccessibilityOverlayEnabled ? ON_LABEL : OFF_LABEL}
          checked={isAccessibilityOverlayEnabled}
          onChange={(e) => toggleAccessibilityOverlay(e.target.checked)}
        />
      </SettingsFormRow>
      <SettingsFormRow
        label={i18n.translate('console.settingsPage.elasticsearchHostLabel', {
          defaultMessage: 'Elasticsearch host',
        })}
      >
        <EuiSuperSelect
          css={styles.minWidthControl}
          compressed
          disabled={availableHosts.length < 2}
          options={availableHosts.map((host) => ({
            value: host,
            inputDisplay: host,
          }))}
          valueOfSelected={selectedHost || (availableHosts.length > 0 ? availableHosts[0] : '')}
          aria-label={i18n.translate('console.settingsPage.elasticsearchHostLabel', {
            defaultMessage: 'Elasticsearch host',
          })}
          onChange={(value) => setSelectedHost(value)}
        />
      </SettingsFormRow>

      {/* DISPLAY SETTINGS */}
      <SettingsGroup
        title={i18n.translate('console.settingsPage.displaySettingsLabel', {
          defaultMessage: 'Display',
        })}
      />
      <SettingsFormRow
        label={i18n.translate('console.settingsPage.fontSizeLabel', {
          defaultMessage: 'Font size',
        })}
      >
        <EuiFieldNumber
          css={styles.minWidthControl}
          compressed
          data-test-subj="setting-font-size-input"
          value={fontSize}
          min={6}
          max={50}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!val) return;
            setFontSize(val);
          }}
        />
      </SettingsFormRow>
      <SettingsFormRow
        label={i18n.translate('console.settingsPage.wrapLongLinesLabel', {
          defaultMessage: 'Wrap long lines',
        })}
      >
        <EuiSwitch
          data-test-subj="settingsWrapLines"
          label={wrapMode ? ON_LABEL : OFF_LABEL}
          checked={wrapMode}
          onChange={(e) => setWrapMode(e.target.checked)}
          id="wrapLines"
        />
      </SettingsFormRow>
      <SettingsFormRow
        label={i18n.translate('console.settingsPage.tripleQuotesMessage', {
          defaultMessage: 'Triple quotes in output',
        })}
      >
        <EuiSwitch
          data-test-subj="tripleQuotes"
          label={tripleQuotes ? ON_LABEL : OFF_LABEL}
          checked={tripleQuotes}
          onChange={(e) => setTripleQuotes(e.target.checked)}
          id="tripleQuotes"
        />
      </SettingsFormRow>

      {/* AUTOCOMPLETE SETTINGS */}
      <SettingsGroup
        title={i18n.translate('console.settingsPage.autocompleteSettingsLabel', {
          defaultMessage: 'Autocomplete',
        })}
      />
      {autoCompleteCheckboxes.map((opts) => (
        <SettingsFormRow key={opts.id} label={opts.label}>
          <EuiSwitch
            data-test-subj={`autocomplete-settings-${opts.id}`}
            label={opts.checked ? ON_LABEL : OFF_LABEL}
            checked={opts.checked}
            onChange={(e) => opts.stateSetter(e.target.checked)}
          />
        </SettingsFormRow>
      ))}

      {/* AUTOCOMPLETE REFRESH SETTINGS */}
      {(fields || indices || templates || dataStreams) && (
        <>
          <SettingsGroup
            title={i18n.translate('console.settingsPage.autocompleteRefreshSettingsLabel', {
              defaultMessage: 'Autocomplete refresh',
            })}
            description={i18n.translate(
              'console.settingsPage.autocompleteRefreshSettingsDescription',
              {
                defaultMessage:
                  'Console refreshes autocomplete suggestions by querying Elasticsearch. Use less frequent refreshes to reduce bandwidth costs.',
              }
            )}
          />
          <SettingsFormRow
            label={i18n.translate('console.settingsPage.refreshingDataLabel', {
              defaultMessage: 'Refresh frequency',
            })}
          >
            <EuiSuperSelect
              css={styles.minWidthControl}
              compressed
              options={intervalOptions}
              valueOfSelected={pollInterval.toString()}
              aria-label={i18n.translate('console.settingsPage.refreshingDataLabel', {
                defaultMessage: 'Refresh frequency',
              })}
              onChange={onPollingIntervalChange}
            />
          </SettingsFormRow>

          <SettingsFormRow
            label={i18n.translate('console.settingsPage.manualRefreshLabel', {
              defaultMessage: 'Manually refresh autocomplete suggestions',
            })}
          >
            <EuiButton
              iconType="refresh"
              size="s"
              data-test-subj="autocompletePolling"
              id="autocompletePolling"
              onClick={() => {
                // Only refresh the currently selected settings.
                props.refreshAutocompleteSettings({
                  fields,
                  indices,
                  templates,
                  dataStreams,
                });
              }}
            >
              <FormattedMessage
                defaultMessage="Refresh"
                id="console.settingsPage.refreshButtonLabel"
              />
            </EuiButton>
          </SettingsFormRow>
        </>
      )}
    </>
  );
};
