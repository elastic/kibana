/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import React, { Fragment, useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldNumber,
  EuiFormRow,
  EuiCheckboxGroup,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSwitch,
  EuiSuperSelect,
} from '@elastic/eui';

import { DevToolsSettings } from '../../services';
import { unregisterCommands } from '../containers/editor/legacy/console_editor/keyboard_shortcuts';
import type { SenseEditor } from '../models';

export type AutocompleteOptions = 'fields' | 'indices' | 'templates';

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

interface Props {
  onSaveSettings: (newSettings: DevToolsSettings) => void;
  onClose: () => void;
  refreshAutocompleteSettings: (selectedSettings: DevToolsSettings['autocomplete']) => void;
  settings: DevToolsSettings;
  editorInstance: SenseEditor | null;
}

export function DevToolsSettingsModal(props: Props) {
  const [fontSize, setFontSize] = useState(props.settings.fontSize);
  const [wrapMode, setWrapMode] = useState(props.settings.wrapMode);
  const [fields, setFields] = useState(props.settings.autocomplete.fields);
  const [indices, setIndices] = useState(props.settings.autocomplete.indices);
  const [templates, setTemplates] = useState(props.settings.autocomplete.templates);
  const [dataStreams, setDataStreams] = useState(props.settings.autocomplete.dataStreams);
  const [polling, setPolling] = useState(props.settings.polling);
  const [pollInterval, setPollInterval] = useState(props.settings.pollInterval);
  const [tripleQuotes, setTripleQuotes] = useState(props.settings.tripleQuotes);
  const [historyDisabled, setHistoryDisabled] = useState(props.settings.historyDisabled);
  const [keyboardShortcutsDisabled, setKeyboardShortcutsDisabled] = useState(
    props.settings.keyboardShortcutsDisabled
  );

  const autoCompleteCheckboxes = [
    {
      id: 'fields',
      label: i18n.translate('console.settingsPage.fieldsLabelText', {
        defaultMessage: 'Fields',
      }),
      stateSetter: setFields,
    },
    {
      id: 'indices',
      label: i18n.translate('console.settingsPage.indicesAndAliasesLabelText', {
        defaultMessage: 'Indices & Aliases',
      }),
      stateSetter: setIndices,
    },
    {
      id: 'templates',
      label: i18n.translate('console.settingsPage.templatesLabelText', {
        defaultMessage: 'Templates',
      }),
      stateSetter: setTemplates,
    },
    {
      id: 'dataStreams',
      label: i18n.translate('console.settingsPage.dataStreamsLabelText', {
        defaultMessage: 'Data streams',
      }),
      stateSetter: setDataStreams,
    },
  ];

  const checkboxIdToSelectedMap = {
    fields,
    indices,
    templates,
    dataStreams,
  };

  const onAutocompleteChange = (optionId: AutocompleteOptions) => {
    const option = _.find(autoCompleteCheckboxes, (item) => item.id === optionId);
    if (option) {
      option.stateSetter(!checkboxIdToSelectedMap[optionId]);
    }
  };

  function saveSettings() {
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
      historyDisabled,
      keyboardShortcutsDisabled,
    });
  }

  const onPollingIntervalChange = useCallback((value: string) => {
    const sanitizedValue = parseInt(value, 10);

    setPolling(!!sanitizedValue);
    setPollInterval(sanitizedValue);
  }, []);

  const toggleKeyboardShortcuts = useCallback(
    (disabled: boolean) => {
      if (props.editorInstance) {
        unregisterCommands(props.editorInstance);
        setKeyboardShortcutsDisabled(disabled);
      }
    },
    [props.editorInstance]
  );

  // It only makes sense to show polling options if the user needs to fetch any data.
  const pollingFields =
    fields || indices || templates ? (
      <Fragment>
        <EuiFormRow
          label={
            <FormattedMessage
              id="console.settingsPage.refreshingDataLabel"
              defaultMessage="Refresh frequency"
            />
          }
          helpText={
            <FormattedMessage
              id="console.settingsPage.refreshingDataDescription"
              defaultMessage="Console refreshes autocomplete suggestions by querying Elasticsearch.
              Less frequent refresh is recommended to reduce bandwidth costs."
            />
          }
        >
          <EuiSuperSelect
            options={intervalOptions}
            valueOfSelected={pollInterval.toString()}
            onChange={onPollingIntervalChange}
          />
        </EuiFormRow>

        <EuiButton
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
            defaultMessage="Refresh autocomplete suggestions"
            id="console.settingsPage.refreshButtonLabel"
          />
        </EuiButton>
      </Fragment>
    ) : undefined;

  return (
    <EuiModal
      data-test-subj="devToolsSettingsModal"
      className="conApp__settingsModal"
      onClose={props.onClose}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage id="console.settingsPage.pageTitle" defaultMessage="Console Settings" />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFormRow
          label={
            <FormattedMessage id="console.settingsPage.fontSizeLabel" defaultMessage="Font Size" />
          }
        >
          <EuiFieldNumber
            autoFocus
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
        </EuiFormRow>

        <EuiFormRow>
          <EuiSwitch
            checked={wrapMode}
            data-test-subj="settingsWrapLines"
            id="wrapLines"
            label={
              <FormattedMessage
                defaultMessage="Wrap long lines"
                id="console.settingsPage.wrapLongLinesLabelText"
              />
            }
            onChange={(e) => setWrapMode(e.target.checked)}
          />
        </EuiFormRow>

        <EuiFormRow
          label={
            <FormattedMessage
              id="console.settingsPage.jsonSyntaxLabel"
              defaultMessage="JSON syntax"
            />
          }
        >
          <EuiSwitch
            checked={tripleQuotes}
            data-test-subj="tripleQuotes"
            id="tripleQuotes"
            label={
              <FormattedMessage
                defaultMessage="Use triple quotes in output pane"
                id="console.settingsPage.tripleQuotesMessage"
              />
            }
            onChange={(e) => setTripleQuotes(e.target.checked)}
          />
        </EuiFormRow>

        <EuiFormRow
          label={
            <FormattedMessage id="console.settingsPage.historyLabel" defaultMessage="History" />
          }
        >
          <EuiSwitch
            checked={historyDisabled}
            id="historyDisabled"
            label={
              <FormattedMessage
                defaultMessage="Disable saving requests to history"
                id="console.settingsPage.savingRequestsToHistoryMessage"
              />
            }
            onChange={(e) => setHistoryDisabled(e.target.checked)}
          />
        </EuiFormRow>

        <EuiFormRow
          label={
            <FormattedMessage
              id="console.settingsPage.keyboardShortcutsLabel"
              defaultMessage="Keyboard shortcuts"
            />
          }
        >
          <EuiSwitch
            checked={keyboardShortcutsDisabled}
            label={
              <FormattedMessage
                defaultMessage="Disable keyboard shortcuts"
                id="console.settingsPage.disableKeyboardShortcutsMessage"
              />
            }
            onChange={(e) => toggleKeyboardShortcuts(e.target.checked)}
          />
        </EuiFormRow>

        <EuiFormRow
          labelType="legend"
          label={
            <FormattedMessage
              id="console.settingsPage.autocompleteLabel"
              defaultMessage="Autocomplete"
            />
          }
        >
          <EuiCheckboxGroup
            options={autoCompleteCheckboxes.map((opts) => {
              const { stateSetter, ...rest } = opts;
              return rest;
            })}
            idToSelectedMap={checkboxIdToSelectedMap}
            onChange={(e: unknown) => {
              onAutocompleteChange(e as AutocompleteOptions);
            }}
          />
        </EuiFormRow>

        {pollingFields}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty data-test-subj="settingsCancelButton" onClick={props.onClose}>
          <FormattedMessage id="console.settingsPage.cancelButtonLabel" defaultMessage="Cancel" />
        </EuiButtonEmpty>

        <EuiButton fill data-test-subj="settings-save-button" onClick={saveSettings}>
          <FormattedMessage id="console.settingsPage.saveButtonLabel" defaultMessage="Save" />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
