/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
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
  navigateToApp,
}: {
  row: ManagementLandingNavigateSettingsRowDefinition;
  navigateToApp: ApplicationStart['navigateToApp'];
}) {
  const handleActivate = useCallback(() => {
    navigateToApp('management', { path: row.managementPath });
  }, [navigateToApp, row.managementPath]);

  return (
    <EuiButtonEmpty
      size="xs"
      iconType="sortRight"
      iconSide="right"
      onClick={handleActivate}
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

export function ManagementLandingUiSettingReadonlyValue({
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
    <EuiText
      size="s"
      color="subdued"
      data-test-subj={`managementLandingSettingsUiValue-${row.id}`}
      css={css`
        word-break: break-word;
      `}
    >
      {label}
    </EuiText>
  );
}

export interface LandingSettingsUiEditorHandle {
  save: () => Promise<boolean>;
}

export function ManagementLandingSettingsUiContent({
  row,
  uiSettings,
  onDoneEditing,
}: {
  row: ManagementLandingUiSettingRowDefinition;
  uiSettings: IUiSettingsClient;
  onDoneEditing: () => void;
}) {
  const editorRef = useRef<LandingSettingsUiEditorHandle>(null);
  const [error, setError] = useState<string | undefined>();
  const [saveBusy, setSaveBusy] = useState(false);
  const errorRegionId = `managementLandingSettings-row-${row.id}-error`;
  const requiresReload = Boolean(uiSettings.getAll()[row.uiSettingKey]?.requiresPageReload);

  const handleSave = useCallback(async () => {
    setSaveBusy(true);
    try {
      const ok = await editorRef.current?.save();
      if (ok) {
        onDoneEditing();
      }
    } finally {
      setSaveBusy(false);
    }
  }, [onDoneEditing]);

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={true}>
          <ManagementLandingUiSettingEditor
            ref={editorRef}
            uiSettings={uiSettings}
            uiSettingKey={row.uiSettingKey}
            ariaLabel={row.title}
            ariaDescribedBy={error ? errorRegionId : undefined}
            onError={setError}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            isLoading={saveBusy}
            onClick={handleSave}
            data-test-subj={`managementLandingSettingsRowSave-${row.id}`}
          >
            <FormattedMessage id="management.landing.settingsPanel.saveRow" defaultMessage="Save" />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      {requiresReload ? (
        <>
          <EuiSpacer size="xs" />
          <ReloadHint active />
        </>
      ) : null}
      {error ? (
        <>
          <EuiSpacer size="xs" />
          <div id={errorRegionId} role="alert" aria-live="polite">
            <EuiFormErrorText>{error}</EuiFormErrorText>
          </div>
        </>
      ) : null}
    </>
  );
}

const ManagementLandingUiSettingEditor = forwardRef<
  LandingSettingsUiEditorHandle,
  {
    uiSettings: IUiSettingsClient;
    uiSettingKey: string;
    ariaLabel: string;
    ariaDescribedBy?: string;
    onError: (msg: string | undefined) => void;
  }
>(function ManagementLandingUiSettingEditor(props, ref) {
  const { uiSettings, uiSettingKey, ariaLabel, ariaDescribedBy, onError } = props;

  const tzRef = useRef<LandingSettingsUiEditorHandle>(null);
  const dmRef = useRef<LandingSettingsUiEditorHandle>(null);
  const dowRef = useRef<LandingSettingsUiEditorHandle>(null);
  const textRef = useRef<LandingSettingsUiEditorHandle>(null);

  useImperativeHandle(
    ref,
    () => ({
      save: async () => {
        if (uiSettingKey === 'dateFormat:tz') {
          return (await tzRef.current?.save()) ?? false;
        }
        if (uiSettingKey === 'theme:darkMode') {
          return (await dmRef.current?.save()) ?? false;
        }
        if (uiSettingKey === 'dateFormat:dow') {
          return (await dowRef.current?.save()) ?? false;
        }
        return (await textRef.current?.save()) ?? false;
      },
    }),
    [uiSettingKey]
  );

  if (uiSettingKey === 'dateFormat:tz') {
    return (
      <TimezoneSelect
        ref={tzRef}
        uiSettings={uiSettings}
        ariaLabel={ariaLabel}
        ariaDescribedBy={ariaDescribedBy}
        onError={onError}
      />
    );
  }

  if (uiSettingKey === 'theme:darkMode') {
    return (
      <DarkModeSelect
        ref={dmRef}
        uiSettings={uiSettings}
        ariaLabel={ariaLabel}
        ariaDescribedBy={ariaDescribedBy}
        onError={onError}
      />
    );
  }

  if (uiSettingKey === 'dateFormat:dow') {
    return (
      <DayOfWeekSelect
        ref={dowRef}
        uiSettings={uiSettings}
        ariaLabel={ariaLabel}
        ariaDescribedBy={ariaDescribedBy}
        onError={onError}
      />
    );
  }

  return (
    <DebouncedTextSetting
      ref={textRef}
      uiSettings={uiSettings}
      uiSettingKey={uiSettingKey}
      ariaLabel={ariaLabel}
      ariaDescribedBy={ariaDescribedBy}
      onError={onError}
    />
  );
});

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

const TimezoneSelect = forwardRef<
  LandingSettingsUiEditorHandle,
  {
    uiSettings: IUiSettingsClient;
    ariaLabel: string;
    ariaDescribedBy?: string;
    onError: (msg: string | undefined) => void;
  }
>(function TimezoneSelect(props, ref) {
  const { uiSettings, ariaLabel, ariaDescribedBy, onError } = props;
  const key = 'dateFormat:tz';
  const remote = useSyncedUiSettingString(uiSettings, key);
  const [local, setLocal] = useState(remote);

  useEffect(() => {
    setLocal(remote);
  }, [remote]);

  useImperativeHandle(
    ref,
    () => ({
      save: async () => {
        if (local === remote) {
          return true;
        }
        return validateAndSet(uiSettings, key, local, onError);
      },
    }),
    [local, remote, uiSettings, onError]
  );

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

  return (
    <EuiSuperSelect
      compressed
      options={options}
      valueOfSelected={local}
      onChange={(value: string) => setLocal(value)}
      fullWidth
      data-test-subj={`managementLandingSettingsUiControl-${key.replace(/:/g, '-')}`}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
    />
  );
});

const DarkModeSelect = forwardRef<
  LandingSettingsUiEditorHandle,
  {
    uiSettings: IUiSettingsClient;
    ariaLabel: string;
    ariaDescribedBy?: string;
    onError: (msg: string | undefined) => void;
  }
>(function DarkModeSelect(props, ref) {
  const { uiSettings, ariaLabel, ariaDescribedBy, onError } = props;
  const key = 'theme:darkMode';
  const remote = useSyncedUiSettingString(uiSettings, key);
  const [local, setLocal] = useState(remote);
  const meta = uiSettings.getAll()[key];

  useEffect(() => {
    setLocal(remote);
  }, [remote]);

  useImperativeHandle(
    ref,
    () => ({
      save: async () => {
        if (local === remote) {
          return true;
        }
        return validateAndSet(uiSettings, key, local, onError);
      },
    }),
    [local, remote, uiSettings, onError]
  );

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

  return (
    <EuiSelect
      compressed
      options={selectOptions}
      value={local}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLocal(e.target.value)}
      fullWidth
      data-test-subj={`managementLandingSettingsUiControl-${key.replace(/:/g, '-')}`}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
    />
  );
});

const DayOfWeekSelect = forwardRef<
  LandingSettingsUiEditorHandle,
  {
    uiSettings: IUiSettingsClient;
    ariaLabel: string;
    ariaDescribedBy?: string;
    onError: (msg: string | undefined) => void;
  }
>(function DayOfWeekSelect(props, ref) {
  const { uiSettings, ariaLabel, ariaDescribedBy, onError } = props;
  const key = 'dateFormat:dow';
  const remote = useSyncedUiSettingString(uiSettings, key);
  const [local, setLocal] = useState(remote);
  const meta = uiSettings.getAll()[key];

  useEffect(() => {
    setLocal(remote);
  }, [remote]);

  useImperativeHandle(
    ref,
    () => ({
      save: async () => {
        if (local === remote) {
          return true;
        }
        return validateAndSet(uiSettings, key, local, onError);
      },
    }),
    [local, remote, uiSettings, onError]
  );

  const selectOptions = useMemo(() => {
    let rawOpts = Array.isArray(meta?.options) ? meta.options.map(String) : [];
    if (rawOpts.length === 0 && local) {
      rawOpts = [local];
    }
    return rawOpts.map((v) => ({ text: v, value: v }));
  }, [meta?.options, local]);

  return (
    <EuiSelect
      compressed
      options={selectOptions}
      value={local}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLocal(e.target.value)}
      fullWidth
      data-test-subj={`managementLandingSettingsUiControl-${key.replace(/:/g, '-')}`}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
    />
  );
});

const DebouncedTextSetting = forwardRef<
  LandingSettingsUiEditorHandle,
  {
    uiSettings: IUiSettingsClient;
    uiSettingKey: string;
    ariaLabel: string;
    ariaDescribedBy?: string;
    onError: (msg: string | undefined) => void;
  }
>(function DebouncedTextSetting(props, ref) {
  const { uiSettings, uiSettingKey, ariaLabel, ariaDescribedBy, onError } = props;
  const remote = useSyncedUiSettingString(uiSettings, uiSettingKey);
  const [draft, setDraft] = useState(remote);

  useEffect(() => {
    setDraft(remote);
  }, [remote]);

  useImperativeHandle(
    ref,
    () => ({
      save: async () => {
        if (draft === remote) {
          return true;
        }
        return validateAndSet(uiSettings, uiSettingKey, draft, onError);
      },
    }),
    [draft, remote, uiSettingKey, uiSettings, onError]
  );

  return (
    <EuiFieldText
      fullWidth
      compressed
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      data-test-subj={`managementLandingSettingsUiControl-${uiSettingKey.replace(/:/g, '-')}`}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
    />
  );
});
