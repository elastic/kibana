/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiNotificationBadge,
  EuiText,
  EuiButtonIcon,
  EuiSpacer,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  DiscoveryOnlyHotkeyDefinition,
  HotkeyDefinition,
  HotkeysSidebarActions,
} from '@kbn/core-hotkeys-browser';
import { formatChord } from '../../utils';

type HotkeyDefinitionOrDiscoveryOnlyHotkeyDefinition =
  | HotkeyDefinition
  | DiscoveryOnlyHotkeyDefinition;

const separatorToken = '+' as const;

const keysToEditableString = (
  keys: HotkeyDefinitionOrDiscoveryOnlyHotkeyDefinition['keys']
): string => (typeof keys === 'string' ? keys : JSON.stringify(keys));

const parseChordInput = (raw: string): HotkeyDefinition['keys'] | undefined => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.startsWith('{')) {
    try {
      return JSON.parse(trimmed) as HotkeyDefinitionOrDiscoveryOnlyHotkeyDefinition['keys'];
    } catch {
      return undefined;
    }
  }
  return trimmed as HotkeyDefinitionOrDiscoveryOnlyHotkeyDefinition['keys'];
};

export const HotkeyRow = ({
  def,
  actions,
}: {
  def: HotkeyDefinitionOrDiscoveryOnlyHotkeyDefinition;
  actions: Pick<HotkeysSidebarActions, 'setHotkeyOverride' | 'clearHotkeyOverride'>;
}) => {
  const modalTitleId = useGeneratedHtmlId();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftChord, setDraftChord] = useState(() => keysToEditableString(def.keys));
  const [error, setError] = useState<string | undefined>();

  const formattedChord = useMemo(() => formatChord(def.keys, { separatorToken }), [def.keys]);

  const defaultChordDisplay = useMemo(() => {
    const dk = def.defaultKeys ?? def.keys;
    try {
      return typeof dk === 'string' ? dk : JSON.stringify(dk);
    } catch {
      return String(dk);
    }
  }, [def.defaultKeys, def.keys]);

  const openModal = useCallback(() => {
    setDraftChord(keysToEditableString(def.keys));
    setError(undefined);
    setIsModalOpen(true);
  }, [def.keys]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setError(undefined);
  }, []);

  const onSave = useCallback(() => {
    const parsed = parseChordInput(draftChord);
    if (parsed === undefined) {
      setError(
        i18n.translate('core.ui.chrome.hotkeysCheatSheet.editShortcutInvalidChord', {
          defaultMessage:
            'Enter a shortcut chord (e.g. Mod+Shift+K) or valid JSON for advanced bindings.',
        })
      );
      return;
    }
    actions.setHotkeyOverride(def.id, parsed);
    closeModal();
  }, [actions, closeModal, def.id, draftChord]);

  const onReset = useCallback(() => {
    actions.clearHotkeyOverride(def.id);
    closeModal();
  }, [actions, closeModal, def.id]);

  let modal: React.ReactNode | undefined;
  if (isModalOpen) {
    modal = (
      <EuiModal
        aria-labelledby={modalTitleId}
        onClose={closeModal}
        data-test-subj="hotkeysCheatSheet-editChordModal"
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle id={modalTitleId}>
            {i18n.translate('core.ui.chrome.hotkeysCheatSheet.editShortcutModalTitle', {
              defaultMessage: 'Edit shortcut',
            })}
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiText size="s">
            <p>
              <strong>{def.label}</strong>
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiFormRow
            label={i18n.translate('core.ui.chrome.hotkeysCheatSheet.editShortcutChordLabel', {
              defaultMessage: 'Keyboard chord',
            })}
            helpText={i18n.translate('core.ui.chrome.hotkeysCheatSheet.editShortcutDefaultHint', {
              defaultMessage: 'Default shipping chord: {defaultChord}',
              values: { defaultChord: defaultChordDisplay },
            })}
            isInvalid={Boolean(error)}
            error={error}
          >
            <EuiFieldText
              value={draftChord}
              onChange={(e) => {
                setDraftChord(e.target.value);
                setError(undefined);
              }}
              fullWidth
              autoFocus
              isInvalid={Boolean(error)}
              data-test-subj="hotkeysCheatSheet-editChordInput"
            />
          </EuiFormRow>
        </EuiModalBody>
        <EuiModalFooter>
          <EuiButtonEmpty onClick={closeModal}>
            {i18n.translate('core.ui.chrome.hotkeysCheatSheet.editShortcutCancel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
          <EuiButtonEmpty color="danger" onClick={onReset}>
            {i18n.translate('core.ui.chrome.hotkeysCheatSheet.editShortcutReset', {
              defaultMessage: 'Reset to default',
            })}
          </EuiButtonEmpty>
          <EuiButton fill onClick={onSave} data-test-subj="hotkeysCheatSheet-editChordSave">
            {i18n.translate('core.ui.chrome.hotkeysCheatSheet.editShortcutSave', {
              defaultMessage: 'Save',
            })}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    );
  }

  return (
    <>
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="m"
        responsive={false}
        data-test-subj={`hotkeysCheatSheet-chord-${def.id}`}
      >
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{def.label}</strong>
          </EuiText>
          {def.description ? (
            <EuiText size="xs" color="subdued">
              {def.description}
            </EuiText>
          ) : null}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs">
            {def.editable ? (
              <EuiFlexItem
                grow={false}
                css={css`
                  // visibility: hidden;
                  // &:hover {
                  //   visibility: visible;
                  // }
                `}
              >
                <EuiButtonIcon
                  aria-label={i18n.translate(
                    'core.ui.chrome.hotkeysCheatSheet.editShortcutButtonAriaLabel',
                    {
                      defaultMessage: 'Edit shortcut for {label}',
                      values: { label: def.label },
                    }
                  )}
                  color="text"
                  iconType="pencil"
                  onClick={openModal}
                  data-test-subj={`hotkeysCheatSheet-edit-${def.id}`}
                />
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow={false}>
              <EuiToolTip content={formattedChord}>
                <EuiFlexGroup gutterSize="xs">
                  {formattedChord.split(separatorToken).map((key) => (
                    <EuiFlexItem key={key} grow={false}>
                      <EuiNotificationBadge color="subdued">{key}</EuiNotificationBadge>
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {modal}
    </>
  );
};
