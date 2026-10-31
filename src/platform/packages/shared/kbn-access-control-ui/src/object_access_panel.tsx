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
  EuiButton,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout, KbnInfoCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { isEqual } from 'lodash';
import {
  toAclDocument,
  type AclWarning,
  type CanonicalAcl,
  type Principal,
} from '@kbn/access-control';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import { AccessDraftEditor } from './access_draft_editor';
import { AccessSummary } from './access_summary';
import type { AccessCopy } from './copy';
import {
  toAccessControlError,
  useAccessControlApi,
  useAccessPolicy,
  useObjectAccess,
  type AccessControlError,
} from './hooks';
import { TransferModal } from './transfer_modal';
import type { AccessDraft, AccessPolicyResponse } from './types';

export interface ObjectAccessPanelProps {
  http: Pick<HttpSetup, 'get' | 'put' | 'post'>;
  toasts?: Pick<ToastsStart, 'addSuccess' | 'addWarning'>;
  type: string;
  id: string;
  copy: AccessCopy;
  /** Called after access changed, for example to refresh permissions the consumer shows. */
  onAccessChange?: () => void;
}

/**
 * Lets people see and manage who can access one object. Access managers edit general access, named
 * entries, and ownership; everyone else sees what they can do. Every decision comes from the
 * server: the panel only renders the permissions it receives.
 */
export const ObjectAccessPanel = ({
  http,
  toasts,
  type,
  id,
  copy,
  onAccessChange,
}: ObjectAccessPanelProps) => {
  const api = useAccessControlApi(http);
  const policy = useAccessPolicy(http, type);
  const access = useObjectAccess(http, type, id, { isEnabled: !!policy.data?.enabled });
  const state = access.data;

  const savedDraft = useMemo(
    () => (policy.data && state?.acl ? toAccessDraft(policy.data, state.acl) : undefined),
    [policy.data, state?.acl]
  );
  const [draft, setDraft] = useState<AccessDraft>();
  const [warnings, setWarnings] = useState<AclWarning[]>([]);
  const [saveError, setSaveError] = useState<AccessControlError>();
  const [isSaving, setIsSaving] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [restrictOnClaim, setRestrictOnClaim] = useState(false);
  const claimCheckboxId = useGeneratedHtmlId();

  useEffect(() => setDraft(savedDraft), [savedDraft]);

  const suggestPrincipals = useCallback(
    (name: string, signal: AbortSignal) => api.suggest(type, name, signal),
    [api, type]
  );

  const reload = useCallback(() => {
    setSaveError(undefined);
    access.reload();
  }, [access]);

  const runChange = async (change: () => Promise<{ warnings: AclWarning[] }>, message: string) => {
    setIsSaving(true);
    setSaveError(undefined);
    try {
      const result = await change();
      setWarnings(result.warnings);
      if (result.warnings.length > 0) {
        toasts?.addWarning(
          i18n.translate('accessControlUi.panel.savedWithWarnings', {
            defaultMessage:
              'Access saved. {count, plural, one {# person needs} other {# people need}} a role with more privileges before their access applies.',
            values: { count: result.warnings.length },
          })
        );
      } else {
        toasts?.addSuccess(message);
      }
      access.reload();
      onAccessChange?.();
    } catch (error) {
      setSaveError(toAccessControlError(error));
    } finally {
      setIsSaving(false);
    }
  };

  if (policy.isLoading || (access.isLoading && !state)) {
    return <EuiSkeletonText lines={4} data-test-subj="accessPanelLoading" />;
  }

  // The consumer hides the panel while object-level security is disabled. A stale panel shows
  // nothing it could save.
  if (!policy.data?.enabled) {
    return (
      <KbnInfoCallout
        announceOnMount
        size="s"
        data-test-subj="accessPanelDisabled"
        title={i18n.translate('accessControlUi.panel.disabled', {
          defaultMessage: 'Object-level access control is turned off.',
        })}
      />
    );
  }

  const loadError = policy.error ?? access.error;
  if (loadError || !state) {
    return <ErrorCallout error={loadError} copy={copy} />;
  }

  const canManage = state.permissions.includes('manage_access');
  const canTransfer = state.permissions.includes('transfer');
  const isDirty = !!draft && !isEqual(draft, savedDraft);
  const owner = state.acl ? toAclDocument(toModelPolicy(policy.data), state.acl).owner : undefined;

  return (
    <div data-test-subj="accessPanel">
      {saveError ? (
        <>
          <ErrorCallout error={saveError} copy={copy} onReload={reload} />
          <EuiSpacer size="m" />
        </>
      ) : null}

      {state.state === 'invalid' ? (
        <>
          <KbnDangerCallout
            announceOnMount
            data-test-subj="accessPanelInvalidAcl"
            title={i18n.translate('accessControlUi.panel.invalidAcl', {
              defaultMessage:
                "This {objectNoun}'s access data is damaged. Replace it or transfer ownership to repair it.",
              values: { objectNoun: copy.objectNoun },
            })}
          />
          <EuiSpacer size="m" />
        </>
      ) : state.via_recovery.includes('manage_access') ? (
        <>
          <KbnInfoCallout
            announceOnMount
            size="s"
            data-test-subj="accessPanelRecovery"
            title={i18n.translate('accessControlUi.panel.recovery', {
              defaultMessage:
                'You are managing access as an administrator. Your changes are audited.',
            })}
          />
          <EuiSpacer size="m" />
        </>
      ) : null}

      {state.can_claim ? (
        <>
          <KbnInfoCallout
            announceOnMount
            data-test-subj="accessPanelClaimCallout"
            title={i18n.translate('accessControlUi.panel.claimTitle', {
              defaultMessage: 'This {objectNoun} has no owner',
              values: { objectNoun: copy.objectNoun },
            })}
            text={
              <p>
                {i18n.translate('accessControlUi.panel.claimDescription', {
                  defaultMessage:
                    'Become the owner to decide who can access it from now on. Everyone keeps their current access unless you restrict it.',
                })}
              </p>
            }
            actionProps={{
              primary: {
                children: i18n.translate('accessControlUi.panel.claim', {
                  defaultMessage: 'Become the owner',
                }),
                isLoading: isSaving,
                'data-test-subj': 'accessPanelClaim',
                onClick: () =>
                  runChange(
                    () => api.claim(type, id, state.version, restrictOnClaim ? 'none' : undefined),
                    i18n.translate('accessControlUi.panel.claimed', {
                      defaultMessage: 'You are now the owner.',
                    })
                  ),
              },
            }}
          >
            <EuiCheckbox
              id={claimCheckboxId}
              checked={restrictOnClaim}
              onChange={(event) => setRestrictOnClaim(event.target.checked)}
              label={i18n.translate('accessControlUi.panel.claimRestrict', {
                defaultMessage: 'Also make it visible only to me',
              })}
            />
          </KbnInfoCallout>
          <EuiSpacer size="m" />
        </>
      ) : null}

      {canManage && draft ? (
        <>
          <AccessDraftEditor
            policy={policy.data}
            value={draft}
            onChange={setDraft}
            suggestPrincipals={suggestPrincipals}
            copy={copy}
            owner={owner}
            isOwnerSelf={state.is_owner}
            savedValue={savedDraft}
            profiles={state.profiles}
            warnings={warnings.map(({ principal }) => principal)}
            onTransfer={canTransfer ? () => setIsTransferOpen(true) : undefined}
            isDisabled={isSaving}
          />
          <EuiSpacer size="m" />
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                isDisabled={!isDirty || isSaving}
                onClick={() => setDraft(savedDraft)}
                data-test-subj="accessPanelCancel"
              >
                {i18n.translate('accessControlUi.panel.cancel', { defaultMessage: 'Discard' })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isDisabled={!isDirty}
                isLoading={isSaving}
                data-test-subj="accessPanelSave"
                onClick={() =>
                  runChange(
                    () => api.replace(type, id, state.version, draft),
                    i18n.translate('accessControlUi.panel.saved', {
                      defaultMessage: 'Access saved.',
                    })
                  )
                }
              >
                {i18n.translate('accessControlUi.panel.save', { defaultMessage: 'Save access' })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : (
        <AccessSummary state={state} operations={Object.keys(policy.data.operations)} copy={copy} />
      )}

      {isTransferOpen ? (
        <TransferModal
          owner={owner}
          isOwnerSelf={state.is_owner}
          suggestPrincipals={suggestPrincipals}
          copy={copy}
          onClose={() => setIsTransferOpen(false)}
          onTransfer={async (newOwner: Principal) => {
            await runChange(
              () => api.transfer(type, id, state.version, newOwner),
              i18n.translate('accessControlUi.panel.transferred', {
                defaultMessage: 'Ownership transferred.',
              })
            );
            setIsTransferOpen(false);
          }}
        />
      ) : null}
    </div>
  );
};

const ErrorCallout = ({
  error,
  copy,
  onReload,
}: {
  error?: AccessControlError;
  copy: AccessCopy;
  onReload?: () => void;
}) => {
  if (error?.statusCode === 409) {
    return (
      <KbnWarningCallout
        announceOnMount
        data-test-subj="accessPanelConflict"
        title={i18n.translate('accessControlUi.panel.conflict', {
          defaultMessage: 'Access changed since you opened it.',
        })}
        actionProps={{
          primary: {
            children: i18n.translate('accessControlUi.panel.reload', { defaultMessage: 'Reload' }),
            onClick: onReload,
            'data-test-subj': 'accessPanelConflictReload',
          },
        }}
      />
    );
  }

  return (
    <KbnDangerCallout
      data-test-subj="accessPanelError"
      title={
        error?.statusCode === 404
          ? i18n.translate('accessControlUi.panel.notFound', {
              defaultMessage: 'The {objectNoun} was not found or you can no longer access it.',
              values: { objectNoun: copy.objectNoun },
            })
          : error?.message ??
            i18n.translate('accessControlUi.panel.unknownError', {
              defaultMessage: 'Access could not be loaded.',
            })
      }
    />
  );
};

/**
 * Turns the API's policy into the model's shape, so that the model's rules read stored ACLs.
 */
const toModelPolicy = (policy: AccessPolicyResponse) => ({
  generalAccess: policy.general_access,
  entryLevels: policy.entry_levels,
  operations: Object.fromEntries(
    Object.entries(policy.operations).map(([name, { level }]) => [name, { level, privileges: {} }])
  ),
});

/**
 * Returns the editable part of a stored ACL: general access and named entries, without the owner.
 */
export const toAccessDraft = (policy: AccessPolicyResponse, acl: CanonicalAcl): AccessDraft => {
  const { general_access: generalAccess, entries } = toAclDocument(toModelPolicy(policy), acl);
  return {
    general_access: generalAccess,
    entries: entries.map(({ type, id, access }) => ({ type, id, access })),
  };
};
