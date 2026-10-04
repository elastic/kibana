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
  PAGE_LINK_API_PATH,
  PAGE_ROTATE_API_PATH,
} from '../../../../common/lib/api_constants';
import { useKibana } from '../../../hooks/use_kibana';

interface PageLinkResponse {
  enabled: boolean;
  path: string;
}

interface WorkflowPageShareModalProps {
  workflowId: string;
  onClose: () => void;
}

const copyLabel = i18n.translate('workflows.pageShare.copy', {
  defaultMessage: 'Copy page URL',
});

const linkQueryKey = (workflowId: string) => ['workflowPageLink', workflowId];

/** Prefixes the server path with the public origin, so the link works outside this browser. */
const toAbsoluteUrl = (path: string, publicBaseUrl: string | undefined): string =>
  `${publicBaseUrl ? new URL(publicBaseUrl).origin : window.location.origin}${path}`;

/** Shows the shareable URL of a workflow page, with copy and rotate. */
export const WorkflowPageShareModal = ({ workflowId, onClose }: WorkflowPageShareModalProps) => {
  const { http } = useKibana().services;
  const queryClient = useQueryClient();
  const [isConfirmingRotate, setIsConfirmingRotate] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [hasRotateError, setHasRotateError] = useState(false);

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
            {!data.enabled && (
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
