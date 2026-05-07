/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFieldText,
  EuiFormErrorText,
  EuiSelect,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  type EuiSuperSelectOption,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { ApplicationStart } from '@kbn/core/public';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { TIMEZONE_OPTIONS } from '@kbn/core-ui-settings-common';
import type {
  ManagementLandingNavigateSettingsRowDefinition,
  ManagementLandingUiSettingRowDefinition,
} from './management_landing_settings_definitions';

function useSyncedUiSettingString(uiSettings: IUiSettingsClient, key: string): string {
  const read = useCallback(() => readUiSettingAsDisplayString(uiSettings, key), [uiSettings, key]);
  const [value, setValue] = useState(read);

  useEffect(() => {
    const refresh = () => setValue(read());
    refresh();
    const sub = uiSettings.getUpdate$().subscribe((u) => {
      if (u.key === key) {
        refresh();
      }
    });
    return () => sub.unsubscribe();
  }, [uiSettings, key, read]);

  return value;
}

function readUiSettingAsDisplayString(uiSettings: IUiSettingsClient, key: string): string {
  const raw = uiSettings.get(key);
  if (key === 'theme:darkMode') {
    if (typeof raw === 'boolean') {
      return raw ? 'enabled' : 'disabled';
    }
    if (raw === 'enabled' || raw === 'disabled' || raw === 'system') {
      return raw;
    }
    return 'disabled';
  }
  if (typeof raw === 'string') {
    return raw;
  }
  return raw === undefined || raw === null ? '' : String(raw);
}

/** Human-readable label for the current uiSetting value (read-only display). */
function formatUiSettingReadonlyLabel(
  uiSettings: IUiSettingsClient,
  key: string,
  rawDisplay: string
): string {
  if (key === 'theme:darkMode') {
    const meta = uiSettings.getAll()[key];
    const labels =
      meta?.optionLabels && typeof meta.optionLabels === 'object'
        ? (meta.optionLabels as Record<string, string>)
        : undefined;
    return labels?.[rawDisplay] ?? rawDisplay;
  }
  return rawDisplay;
}

async function validateAndSet(
  uiSettings: IUiSettingsClient,
  key: string,
  next: unknown,
  onError: (msg: string | undefined) => void
): Promise<boolean> {
  onError(undefined);
  const validation = await uiSettings.validateValue(key, next);
  if (!validation.successfulValidation) {
    onError(
      i18n.translate('management.landing.settingsPanel.validationUnavailableError', {
        defaultMessage: 'Unable to validate this setting. Try again.',
      })
    );
    return false;
  }
  if (!validation.valid) {
    onError(validation.errorMessage);
    return false;
  }
  try {
    await uiSettings.set(key, next);
    return true;
  } catch (err) {
    onError(
      err instanceof Error
        ? err.message
        : i18n.translate('management.landing.settingsPanel.saveFailedError', {
            defaultMessage: 'Could not save setting.',
          })
    );
    return false;
  }
}

export function ManagementLandingSettingsNavigateContent({
  row,
  isEditing,
  navigateToApp,
}: {
  row: ManagementLandingNavigateSettingsRowDefinition;
  isEditing: boolean;
  navigateToApp: ApplicationStart['navigateToApp'];
}) {
  const handleNavigate = useCallback(() => {
    navigateToApp('management', { path: row.managementPath });
  }, [navigateToApp, row.managementPath]);

  if (!isEditing) {
    return (
      <EuiText
        size="s"
        color="subdued"
        data-test-subj={`managementLandingSettingsNavigateSummary-${row.id}`}
      >
        <FormattedMessage
          id="management.landing.settingsPanel.navigateRowSummary"
          defaultMessage="Open user management to add people to your organization."
        />
      </EuiText>
    );
  }

  return (
    <EuiButtonEmpty
      size="xs"
      iconType="sortRight"
      iconSide="right"
      onClick={handleNavigate}
      data-test-subj={`managementLandingSettingsNavigate-${row.id}`}
      aria-label={i18n.translate('management.landing.settingsPanel.navigateRowAriaLabel', {
        defaultMessage: 'Open {title}',
        values: { title: row.title },
      })}
    >
      <FormattedMessage id="management.landing.settingsPanel.goToSection" defaultMessage="Go" />
    </EuiButtonEmpty>
  );
}

function ManagementLandingUiSettingReadonlyValue({
  row,
  uiSettings,
}: {
  row: ManagementLandingUiSettingRowDefinition;
  uiSettings: IUiSettingsClient;
}) {
  const raw = useSyncedUiSettingString(uiSettings, row.uiSettingKey);
  const label = useMemo(
    () => formatUiSettingReadonlyLabel(uiSettings, row.uiSettingKey, raw),
    [uiSettings, row.uiSettingKey, raw]
  );

  return (
    <EuiText size="s" color="subdued" data-test-subj={`managementLandingSettingsUiValue-${row.id}`}>
      {label}
    </EuiText>
  );
}

export function ManagementLandingSettingsUiContent({
  row,
  isEditing,
  uiSettings,
}: {
  row: ManagementLandingUiSettingRowDefinition;
  isEditing: boolean;
  uiSettings: IUiSettingsClient;
}) {
  const [error, setError] = useState<string | undefined>();
  const errorRegionId = `managementLandingSettings-row-${row.id}-error`;

  if (!isEditing) {
    return <ManagementLandingUiSettingReadonlyValue row={row} uiSettings={uiSettings} />;
  }

  return (
    <>
      <ManagementLandingUiSettingEditor
        uiSettings={uiSettings}
        uiSettingKey={row.uiSettingKey}
        ariaLabel={row.title}
        ariaDescribedBy={error ? errorRegionId : undefined}
        onError={setError}
      />
      {error ? (
        <div id={errorRegionId} role="alert" aria-live="polite">
          <EuiFormErrorText>{error}</EuiFormErrorText>
        </div>
      ) : null}
    </>
  );
}

function ManagementLandingUiSettingEditor({
  uiSettings,
  uiSettingKey,
  ariaLabel,
  ariaDescribedBy,
  onError,
}: {
  uiSettings: IUiSettingsClient;
  uiSettingKey: string;
  ariaLabel: string;
  ariaDescribedBy?: string;
  onError: (msg: string | undefined) => void;
}) {
  const meta = uiSettings.getAll()[uiSettingKey];
  const requiresReload = Boolean(meta?.requiresPageReload);

  if (uiSettingKey === 'dateFormat:tz') {
    return (
      <TimezoneSelect
        uiSettings={uiSettings}
        ariaLabel={ariaLabel}
        ariaDescribedBy={ariaDescribedBy}
        onError={onError}
        requiresReload={requiresReload}
      />
    );
  }

  if (uiSettingKey === 'theme:darkMode') {
    return (
      <DarkModeSelect
        uiSettings={uiSettings}
        ariaLabel={ariaLabel}
        ariaDescribedBy={ariaDescribedBy}
        onError={onError}
        requiresReload={requiresReload}
      />
    );
  }

  if (uiSettingKey === 'dateFormat:dow') {
    return (
      <DayOfWeekSelect
        uiSettings={uiSettings}
        ariaLabel={ariaLabel}
        ariaDescribedBy={ariaDescribedBy}
        onError={onError}
        requiresReload={requiresReload}
      />
    );
  }

  return (
    <DebouncedTextSetting
      uiSettings={uiSettings}
      uiSettingKey={uiSettingKey}
      ariaLabel={ariaLabel}
      ariaDescribedBy={ariaDescribedBy}
      onError={onError}
      requiresReload={requiresReload}
    />
  );
}

function ReloadHint({ active }: { active: boolean }) {
  if (!active) {
    return null;
  }
  return (
    <EuiText size="xs" color="subdued">
      <FormattedMessage
        id="management.landing.settingsPanel.reloadHint"
        defaultMessage="Reload the page for this change to take full effect."
      />
    </EuiText>
  );
}

function TimezoneSelect({
  uiSettings,
  ariaLabel,
  ariaDescribedBy,
  onError,
  requiresReload,
}: {
  uiSettings: IUiSettingsClient;
  ariaLabel: string;
  ariaDescribedBy?: string;
  onError: (msg: string | undefined) => void;
  requiresReload: boolean;
}) {
  const key = 'dateFormat:tz';
  const remote = useSyncedUiSettingString(uiSettings, key);

  const options = useMemo<EuiSuperSelectOption<string>[]>(() => {
    const metaOpts = uiSettings.getAll()[key]?.options;
    const raw =
      Array.isArray(metaOpts) && metaOpts.length > 0 ? metaOpts : ['Browser', ...TIMEZONE_OPTIONS];
    return raw.map((tz) => ({
      value: tz,
      inputDisplay: tz,
      dropdownDisplay: tz,
    }));
  }, [uiSettings]);

  const handleChange = useCallback(
    async (value: string) => {
      await validateAndSet(uiSettings, key, value, onError);
    },
    [uiSettings, onError]
  );

  return (
    <>
      <EuiSuperSelect
        compressed
        options={options}
        valueOfSelected={remote}
        onChange={handleChange}
        fullWidth
        data-test-subj={`managementLandingSettingsUiControl-${key.replace(/:/g, '-')}`}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
      />
      <EuiSpacer size="xs" />
      <ReloadHint active={requiresReload} />
    </>
  );
}

function DarkModeSelect({
  uiSettings,
  ariaLabel,
  ariaDescribedBy,
  onError,
  requiresReload,
}: {
  uiSettings: IUiSettingsClient;
  ariaLabel: string;
  ariaDescribedBy?: string;
  onError: (msg: string | undefined) => void;
  requiresReload: boolean;
}) {
  const key = 'theme:darkMode';
  const remote = useSyncedUiSettingString(uiSettings, key);
  const meta = uiSettings.getAll()[key];

  const selectOptions = useMemo(() => {
    const labelsRecord =
      meta?.optionLabels && typeof meta.optionLabels === 'object'
        ? (meta.optionLabels as Record<string, string>)
        : {};
    const rawOpts =
      Array.isArray(meta?.options) && meta.options.length > 0
        ? meta.options.map(String)
        : ['enabled', 'disabled', 'system'];
    return rawOpts.map((v) => ({
      text: labelsRecord[v] ?? v,
      value: v,
    }));
  }, [meta]);

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      await validateAndSet(uiSettings, key, e.target.value, onError);
    },
    [uiSettings, onError]
  );

  return (
    <>
      <EuiSelect
        compressed
        options={selectOptions}
        value={remote}
        onChange={handleChange}
        fullWidth
        data-test-subj={`managementLandingSettingsUiControl-${key.replace(/:/g, '-')}`}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
      />
      <EuiSpacer size="xs" />
      <ReloadHint active={requiresReload} />
    </>
  );
}

function DayOfWeekSelect({
  uiSettings,
  ariaLabel,
  ariaDescribedBy,
  onError,
  requiresReload,
}: {
  uiSettings: IUiSettingsClient;
  ariaLabel: string;
  ariaDescribedBy?: string;
  onError: (msg: string | undefined) => void;
  requiresReload: boolean;
}) {
  const key = 'dateFormat:dow';
  const remote = useSyncedUiSettingString(uiSettings, key);
  const meta = uiSettings.getAll()[key];

  const selectOptions = useMemo(() => {
    let rawOpts = Array.isArray(meta?.options) ? meta.options.map(String) : [];
    if (rawOpts.length === 0 && remote) {
      rawOpts = [remote];
    }
    return rawOpts.map((v) => ({ text: v, value: v }));
  }, [meta?.options, remote]);

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      await validateAndSet(uiSettings, key, e.target.value, onError);
    },
    [uiSettings, onError]
  );

  return (
    <>
      <EuiSelect
        compressed
        options={selectOptions}
        value={remote}
        onChange={handleChange}
        fullWidth
        data-test-subj={`managementLandingSettingsUiControl-${key.replace(/:/g, '-')}`}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
      />
      <EuiSpacer size="xs" />
      <ReloadHint active={requiresReload} />
    </>
  );
}

function DebouncedTextSetting({
  uiSettings,
  uiSettingKey,
  ariaLabel,
  ariaDescribedBy,
  onError,
  requiresReload,
}: {
  uiSettings: IUiSettingsClient;
  uiSettingKey: string;
  ariaLabel: string;
  ariaDescribedBy?: string;
  onError: (msg: string | undefined) => void;
  requiresReload: boolean;
}) {
  const remote = useSyncedUiSettingString(uiSettings, uiSettingKey);
  const [draft, setDraft] = useState(remote);

  useEffect(() => {
    setDraft(remote);
  }, [remote]);

  const commit = useCallback(async () => {
    if (draft === remote) {
      return;
    }
    await validateAndSet(uiSettings, uiSettingKey, draft, onError);
  }, [draft, remote, uiSettingKey, uiSettings, onError]);

  return (
    <>
      <EuiFieldText
        fullWidth
        compressed
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        data-test-subj={`managementLandingSettingsUiControl-${uiSettingKey.replace(/:/g, '-')}`}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
      />
      <EuiSpacer size="xs" />
      <ReloadHint active={requiresReload} />
    </>
  );
}
