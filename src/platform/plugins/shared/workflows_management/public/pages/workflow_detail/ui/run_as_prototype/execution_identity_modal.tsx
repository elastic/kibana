/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiSuperSelectOption } from '@elastic/eui';
import React, { useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useRunAsPrototype } from './context';
import { bindingStatusOf } from './types';

export const ExecutionIdentityModal = () => {
  const {
    isIdentityModalOpen,
    closeIdentityModal,
    draftRunAs,
    setDraftRunAs,
    accounts,
    canBind,
    openCreateFlyout,
    identityModalPrefill,
  } = useRunAsPrototype();
  const modalTitleId = useGeneratedHtmlId();
  const { euiTheme } = useEuiTheme();
  const [selection, setSelection] = useState<string | null>(draftRunAs);

  useEffect(() => {
    if (isIdentityModalOpen) {
      setSelection(
        identityModalPrefill !== undefined ? identityModalPrefill : draftRunAs
      );
    }
  }, [isIdentityModalOpen, draftRunAs, identityModalPrefill]);

  const status = bindingStatusOf(selection, accounts);
  const selectedAccount = accounts.find((a) => a.id === selection);

  const options = useMemo<Array<EuiSuperSelectOption<string>>>(() => {
    const none: EuiSuperSelectOption<string> = {
      value: '',
      inputDisplay: (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="user" size="s" />
          </EuiFlexItem>
          <EuiFlexItem>
            {i18n.translate('workflows.runAsPrototype.modal.noneOption', {
              defaultMessage: 'No service account',
            })}
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      dropdownDisplay: (
        <div>
          <strong>
            {i18n.translate('workflows.runAsPrototype.modal.noneOption', {
              defaultMessage: 'No service account',
            })}
          </strong>
          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate('workflows.runAsPrototype.modal.noneOptionHelp', {
                defaultMessage: 'Runs as whoever or whatever triggers it (current behavior)',
              })}
            </p>
          </EuiText>
        </div>
      ),
    };

    const accountOptions = accounts
      .filter((a) => a.exists)
      .map((a) => ({
        value: a.id,
        inputDisplay: (
          <code css={{ fontFamily: euiTheme.font.familyCode, fontSize: 13 }}>{a.id}</code>
        ),
        dropdownDisplay: (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem>
              <code css={{ fontFamily: euiTheme.font.familyCode, fontSize: 13 }}>{a.id}</code>
              {a.desc ? (
                <EuiText size="xs" color="subdued">
                  <p>{a.desc}</p>
                </EuiText>
              ) : null}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
                {a.roles.slice(0, 2).map((role) => (
                  <EuiBadge key={role}>{role}</EuiBadge>
                ))}
                {a.roles.length > 2 ? (
                  <EuiBadge>+{a.roles.length - 2}</EuiBadge>
                ) : null}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      }));

    return [none, ...accountOptions];
  }, [accounts, euiTheme.font.familyCode]);

  if (!isIdentityModalOpen) {
    return null;
  }

  return (
    <EuiModal
      onClose={closeIdentityModal}
      aria-labelledby={modalTitleId}
      style={{ width: 560 }}
      data-test-subj="workflowRunAsIdentityModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          <FormattedMessage
            id="workflows.runAsPrototype.modal.title"
            defaultMessage="Execution identity"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="workflows.runAsPrototype.modal.lede"
              defaultMessage="Who this workflow acts as when it runs. With a service account, every run — manual, scheduled, or alert-triggered — uses the same privileges no matter who or what starts it."
            />
          </p>
        </EuiText>
        <EuiSpacer size="m" />

        {!canBind ? (
          <>
            <EuiCallOut
              size="s"
              color="warning"
              iconType="lock"
              title={i18n.translate('workflows.runAsPrototype.modal.lockedTitle', {
                defaultMessage: 'You can view this but not change it.',
              })}
            >
              <FormattedMessage
                id="workflows.runAsPrototype.modal.lockedBody"
                defaultMessage="Binding a service account requires {priv}. Ask an administrator, or save the rest of your changes without touching this."
                values={{ priv: <code>manage_security</code> }}
              />
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        ) : null}

        {status === 'unauthorized' && selection ? (
          <>
            <EuiCallOut
              size="s"
              color="warning"
              iconType="warning"
              title={i18n.translate('workflows.runAsPrototype.modal.unauthorizedTitle', {
                defaultMessage: 'Reference without authorization.',
              })}
            >
              <FormattedMessage
                id="workflows.runAsPrototype.modal.unauthorizedBody"
                defaultMessage="{id} exists, but this workflow was never authorized to use it — the name was copied in, likely from a clone or import. Reselect it here and save to authorize, or choose another account."
                values={{ id: <code>{selection}</code> }}
              />
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        ) : null}

        {status === 'missing' && selection ? (
          <>
            <EuiCallOut
              size="s"
              color="danger"
              iconType="warning"
              title={i18n.translate('workflows.runAsPrototype.modal.missingTitle', {
                defaultMessage: 'Service account not found.',
              })}
            >
              <FormattedMessage
                id="workflows.runAsPrototype.modal.missingBody"
                defaultMessage="{id} was deleted. Choose a replacement or remove the binding; runs fail until you do."
                values={{ id: <code>{selection}</code> }}
              />
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        ) : null}

        <EuiFormRow
          label={i18n.translate('workflows.runAsPrototype.modal.accountLabel', {
            defaultMessage: 'Service account',
          })}
          labelAppend={
            <EuiText size="xs" color="subdued">
              <FormattedMessage id="workflows.runAsPrototype.modal.optional" defaultMessage="Optional" />
            </EuiText>
          }
          helpText={i18n.translate('workflows.runAsPrototype.modal.accountHelp', {
            defaultMessage:
              'Applies when you save the workflow. Anyone who can run the workflow can still choose “Run as me” for a single manual run.',
          })}
          fullWidth
        >
          <EuiSuperSelect
            options={options}
            valueOfSelected={selection ?? ''}
            onChange={(value) => setSelection(value || null)}
            disabled={!canBind}
            fullWidth
            data-test-subj="workflowRunAsAccountSelect"
          />
        </EuiFormRow>

        {canBind ? (
          <>
            <EuiSpacer size="s" />
            <EuiButtonEmpty
              size="s"
              iconType="plusInCircle"
              onClick={openCreateFlyout}
              data-test-subj="workflowRunAsCreateAccount"
            >
              <FormattedMessage
                id="workflows.runAsPrototype.modal.createAccount"
                defaultMessage="Create service account…"
              />
            </EuiButtonEmpty>
          </>
        ) : null}

        {selection && status === 'ok' && selectedAccount ? (
          <>
            <EuiSpacer size="m" />
            <div
              css={{
                padding: euiTheme.size.m,
                border: euiTheme.border.thin,
                borderRadius: euiTheme.border.radius.medium,
                background: euiTheme.colors.backgroundBaseSubdued,
              }}
            >
              <EuiText size="s">
                <EuiFlexGroup direction="column" gutterSize="s">
                  <EuiFlexGroup gutterSize="m" responsive={false}>
                    <EuiFlexItem grow={false} css={{ width: 140, color: euiTheme.colors.textSubdued }}>
                      <FormattedMessage
                        id="workflows.runAsPrototype.modal.previewScheduled"
                        defaultMessage="Scheduled & alert runs"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <FormattedMessage
                        id="workflows.runAsPrototype.modal.previewScheduledValue"
                        defaultMessage="Execute as {id}"
                        values={{
                          id: (
                            <code css={{ fontFamily: euiTheme.font.familyCode }}>
                              {selection}
                            </code>
                          ),
                        }}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiFlexGroup gutterSize="m" responsive={false}>
                    <EuiFlexItem grow={false} css={{ width: 140, color: euiTheme.colors.textSubdued }}>
                      <FormattedMessage
                        id="workflows.runAsPrototype.modal.previewManual"
                        defaultMessage="Manual runs"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <FormattedMessage
                        id="workflows.runAsPrototype.modal.previewManualValue"
                        defaultMessage="Execute as {id}, unless the person chooses Run as me"
                        values={{
                          id: (
                            <code css={{ fontFamily: euiTheme.font.familyCode }}>
                              {selection}
                            </code>
                          ),
                        }}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
                    <EuiFlexItem grow={false} css={{ width: 140, color: euiTheme.colors.textSubdued }}>
                      <FormattedMessage
                        id="workflows.runAsPrototype.modal.previewPrivileges"
                        defaultMessage="Privileges"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
                        {selectedAccount.roles.map((role) => (
                          <EuiBadge key={role}>{role}</EuiBadge>
                        ))}
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexGroup>
              </EuiText>
            </div>
          </>
        ) : null}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={closeIdentityModal}>
          <FormattedMessage id="workflows.runAsPrototype.modal.cancel" defaultMessage="Cancel" />
        </EuiButtonEmpty>
        <EuiButton
          fill
          disabled={!canBind}
          onClick={() => {
            setDraftRunAs(selection);
            closeIdentityModal();
          }}
          data-test-subj="workflowRunAsIdentityDone"
        >
          <FormattedMessage id="workflows.runAsPrototype.modal.done" defaultMessage="Done" />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
