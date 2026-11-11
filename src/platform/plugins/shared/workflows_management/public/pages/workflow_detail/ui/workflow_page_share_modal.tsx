/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCopy,
  EuiFieldText,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSkeletonText,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import React, { useState } from 'react';
import { buildPath } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import {
  INTERNAL_API_VERSION,
  PAGE_ENABLED_API_PATH,
  PAGE_LINK_API_PATH,
  PAGE_ROTATE_API_PATH,
} from '../../../../common/lib/api_constants';
import { useKibana } from '../../../hooks/use_kibana';

interface PageLinkResponse {
  /** The page switch. A disabled page is offline while its workflow keeps running. */
  enabled: boolean;
  workflowEnabled: boolean;
  /** True when the link works: the page is on, the workflow is on, and it has a `run_as`. */
  online: boolean;
  /** The `run_as` service account submissions run as. The page is offline without one. */
  serviceAccountId?: string;
  path: string;
}

interface WorkflowPageShareModalProps {
  workflowId: string;
  /** The page switch and rotating change the page, so they need the Workflows Update privilege. */
  canManage: boolean;
  onClose: () => void;
}

const copyLabel = i18n.translate('workflows.pageShare.copy', {
  defaultMessage: 'Copy page URL',
});

const linkQueryKey = (workflowId: string) => ['workflowPageLink', workflowId];

/** Prefixes the server path with the public origin, so the link works outside this browser. */
const toAbsoluteUrl = (path: string, publicBaseUrl: string | undefined): string =>
  `${publicBaseUrl ? new URL(publicBaseUrl).origin : window.location.origin}${path}`;

/** Shows the shareable URL of a workflow page, with the page switch, copy, and rotate. */
export const WorkflowPageShareModal = ({
  workflowId,
  canManage,
  onClose,
}: WorkflowPageShareModalProps) => {
  const { http } = useKibana().services;
  const queryClient = useQueryClient();
  const [isConfirmingRotate, setIsConfirmingRotate] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [hasRotateError, setHasRotateError] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [hasToggleError, setHasToggleError] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: linkQueryKey(workflowId),
    queryFn: () =>
      http.get<PageLinkResponse>(buildPath(PAGE_LINK_API_PATH, { workflowId }), {
        version: INTERNAL_API_VERSION,
      }),
  });

  const rotate = async () => {
    setIsRotating(true);
    setHasRotateError(false);
    try {
      const rotated = await http.post<PageLinkResponse>(
        buildPath(PAGE_ROTATE_API_PATH, { workflowId }),
        {
          version: INTERNAL_API_VERSION,
        }
      );
      queryClient.setQueryData(linkQueryKey(workflowId), rotated);
      setIsConfirmingRotate(false);
    } catch {
      setHasRotateError(true);
    } finally {
      setIsRotating(false);
    }
  };

  const setPageEnabled = async (enabled: boolean) => {
    setIsToggling(true);
    setHasToggleError(false);
    try {
      const updated = await http.post<PageLinkResponse>(
        buildPath(PAGE_ENABLED_API_PATH, { workflowId }),
        { version: INTERNAL_API_VERSION, body: JSON.stringify({ enabled }) }
      );
      queryClient.setQueryData(linkQueryKey(workflowId), updated);
    } catch {
      setHasToggleError(true);
    } finally {
      setIsToggling(false);
    }
  };

  const url = data ? toAbsoluteUrl(data.path, http.basePath.publicBaseUrl) : '';

  return (
    <EuiModal onClose={onClose} aria-labelledby="workflowPageShareTitle" maxWidth={640}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id="workflowPageShareTitle">
          {i18n.translate('workflows.pageShare.title', { defaultMessage: 'Share page' })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s">
          <p>
            {i18n.translate('workflows.pageShare.description', {
              defaultMessage:
                'Anyone with this link can open the form and run this workflow without signing in to Kibana. Share it only with people who should submit it.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="m" />

        {isLoading && <EuiSkeletonText lines={2} />}

        {isError && (
          <KbnDangerCallout
            announceOnMount
            size="s"
            title={i18n.translate('workflows.pageShare.loadError', {
              defaultMessage:
                'Could not load the page link. Save the workflow with a page trigger and try again.',
            })}
          />
        )}

        {data && (
          <>
            {!data.serviceAccountId && (
              <>
                <KbnWarningCallout
                  size="s"
                  title={i18n.translate('workflows.pageShare.noServiceAccountTitle', {
                    defaultMessage: 'The page needs a service account',
                  })}
                >
                  {i18n.translate('workflows.pageShare.noServiceAccountBody', {
                    defaultMessage:
                      'Visitors have no Kibana identity, so submissions run as a service account. Set settings.run_as in the workflow to make the link work.',
                  })}
                </KbnWarningCallout>
                <EuiSpacer size="m" />
              </>
            )}
            {data.serviceAccountId && (
              <>
                <EuiText size="s" color="subdued">
                  {i18n.translate('workflows.pageShare.runsAs', {
                    defaultMessage: 'Submissions run as the service account {serviceAccountId}.',
                    values: { serviceAccountId: data.serviceAccountId },
                  })}
                </EuiText>
                <EuiSpacer size="m" />
              </>
            )}
            <EuiSwitch
              label={i18n.translate('workflows.pageShare.enabledLabel', {
                defaultMessage: 'Page enabled',
              })}
              checked={data.enabled}
              disabled={!canManage || isToggling}
              onChange={(event) => setPageEnabled(event.target.checked)}
              data-test-subj="workflowPageShareEnabled"
            />
            <EuiSpacer size="m" />
            {hasToggleError && (
              <>
                <KbnDangerCallout
                  announceOnMount
                  size="s"
                  title={i18n.translate('workflows.pageShare.enabledError', {
                    defaultMessage: 'Could not change the page. Try again.',
                  })}
                />
                <EuiSpacer size="m" />
              </>
            )}
            {!data.enabled && (
              <>
                <KbnWarningCallout
                  size="s"
                  title={i18n.translate('workflows.pageShare.disabledTitle', {
                    defaultMessage: 'The page is off',
                  })}
                >
                  {i18n.translate('workflows.pageShare.disabledBody', {
                    defaultMessage:
                      'The link does not work until you enable the page. The workflow keeps running for its other triggers.',
                  })}
                </KbnWarningCallout>
                <EuiSpacer size="m" />
              </>
            )}
            {data.enabled && !data.workflowEnabled && (
              <>
                <KbnWarningCallout
                  size="s"
                  title={i18n.translate('workflows.pageShare.offlineTitle', {
                    defaultMessage: 'The page is offline',
                  })}
                >
                  {i18n.translate('workflows.pageShare.offlineBody', {
                    defaultMessage: 'Enable the workflow to make the link work.',
                  })}
                </KbnWarningCallout>
                <EuiSpacer size="m" />
              </>
            )}
            <EuiFormRow
              fullWidth
              label={i18n.translate('workflows.pageShare.urlLabel', {
                defaultMessage: 'Page URL',
              })}
            >
              <EuiFieldText
                fullWidth
                readOnly
                value={url}
                data-test-subj="workflowPageShareUrl"
                append={
                  <EuiCopy textToCopy={url}>
                    {(copy) => (
                      <EuiToolTip content={copyLabel} disableScreenReaderOutput>
                        <EuiButtonIcon
                          iconType="copy"
                          onClick={copy}
                          aria-label={copyLabel}
                          data-test-subj="workflowPageShareCopy"
                        />
                      </EuiToolTip>
                    )}
                  </EuiCopy>
                }
              />
            </EuiFormRow>

            {isConfirmingRotate && (
              <>
                <EuiSpacer size="m" />
                <KbnWarningCallout
                  size="s"
                  title={i18n.translate('workflows.pageShare.rotateConfirmTitle', {
                    defaultMessage: 'Create a new link?',
                  })}
                >
                  {i18n.translate('workflows.pageShare.rotateConfirmBody', {
                    defaultMessage:
                      'The current link stops working at once. Anyone you shared it with needs the new link.',
                  })}
                </KbnWarningCallout>
              </>
            )}

            {hasRotateError && (
              <>
                <EuiSpacer size="m" />
                <KbnDangerCallout
                  announceOnMount
                  size="s"
                  title={i18n.translate('workflows.pageShare.rotateError', {
                    defaultMessage: 'Could not create a new link. Try again.',
                  })}
                />
              </>
            )}
          </>
        )}
      </EuiModalBody>
      <EuiModalFooter>
        {data &&
          canManage &&
          (isConfirmingRotate ? (
            <>
              <EuiButtonEmpty onClick={() => setIsConfirmingRotate(false)} disabled={isRotating}>
                {i18n.translate('workflows.pageShare.rotateCancel', {
                  defaultMessage: 'Keep current link',
                })}
              </EuiButtonEmpty>
              <EuiButton
                color="warning"
                onClick={rotate}
                isLoading={isRotating}
                data-test-subj="workflowPageShareRotateConfirm"
              >
                {i18n.translate('workflows.pageShare.rotateConfirm', {
                  defaultMessage: 'Create new link',
                })}
              </EuiButton>
            </>
          ) : (
            <EuiButtonEmpty
              color="warning"
              iconType="refresh"
              onClick={() => setIsConfirmingRotate(true)}
              data-test-subj="workflowPageShareRotate"
            >
              {i18n.translate('workflows.pageShare.rotate', {
                defaultMessage: 'Create new link',
              })}
            </EuiButtonEmpty>
          ))}
        {!isConfirmingRotate && (
          <EuiButton onClick={onClose} fill>
            {i18n.translate('workflows.pageShare.done', { defaultMessage: 'Done' })}
          </EuiButton>
        )}
      </EuiModalFooter>
    </EuiModal>
  );
};
