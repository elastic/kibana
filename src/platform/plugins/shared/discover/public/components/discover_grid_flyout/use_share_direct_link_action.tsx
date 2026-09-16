/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiCode, EuiCodeBlock, type EuiFlyoutMenuAction } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { type AggregateQuery, type Query, isOfAggregateQueryType } from '@kbn/es-query';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { getEbtProps } from '@kbn/ebt-click';
import {
  ExpandedDocLinkability,
  getEsqlMissingMetadataExample,
  getExpandedDocLinkDisabledReason,
} from '../../application/main/utils/expanded_doc';
import { useDiscoverServices } from '../../hooks/use_discover_services';

const expandedDocLinkabilityEbtDetails: Record<ExpandedDocLinkability, string> = {
  [ExpandedDocLinkability.Linkable]: 'linkable',
  [ExpandedDocLinkability.EsqlUnsupportedSource]: 'esqlUnsupportedSource',
  [ExpandedDocLinkability.EsqlMissingMetadata]: 'esqlMissingMetadata',
  [ExpandedDocLinkability.EsqlTransformational]: 'esqlTransformational',
};

const EsqlMissingMetadataToastText = ({ example }: { example: string }) => (
  <>
    <p>
      <FormattedMessage
        id="discover.docViews.flyout.copyLinkMissingMetadataDescription"
        defaultMessage="Add <code>METADATA _id, _index</code> on the FROM or TS line, then rerun the query and reopen the row details."
        values={{
          code: (chunks) => <EuiCode>{chunks}</EuiCode>,
        }}
      />
    </p>
    <EuiCodeBlock
      language="esql"
      fontSize="s"
      paddingSize="s"
      isCopyable
      data-test-subj="discoverDocFlyoutCopyLinkMetadataExample"
    >
      {example}
    </EuiCodeBlock>
  </>
);

/**
 * Builds the doc viewer flyout header "Share direct link" action shared by the Discover app and the
 * saved search embeddable. When the current document is not linkable the action stays enabled but
 * explains why via a warning toast instead of copying.
 */
export const useShareDirectLinkAction = ({
  copyLink,
  linkability,
  query,
}: {
  copyLink: () => Promise<void>;
  linkability: ExpandedDocLinkability;
  query: Query | AggregateQuery | undefined;
}): EuiFlyoutMenuAction[] => {
  const services = useDiscoverServices();
  const { toastNotifications } = services;

  return useMemo(() => {
    const disabledReason = getExpandedDocLinkDisabledReason(linkability);
    const copyLinkLabel = i18n.translate('discover.docViews.flyout.copyLinkLabel', {
      defaultMessage: 'Share direct link',
    });

    return [
      {
        iconType: 'share',
        'aria-label': disabledReason
          ? i18n.translate('discover.docViews.flyout.copyLinkUnavailableAriaLabel', {
              defaultMessage: 'Cannot share direct link: {reason}',
              values: { reason: disabledReason },
            })
          : copyLinkLabel,
        toolTipContent: disabledReason ?? copyLinkLabel,
        toolTipProps: {
          anchorProps: {
            'data-test-subj': 'discoverDocFlyoutShareDirectLink',
            ...getEbtProps({
              action: 'shareDirectLink',
              element: 'docViewerFlyoutHeader',
              detail: expandedDocLinkabilityEbtDetails[linkability],
            }),
          },
        },
        onClick: () => {
          if (disabledReason) {
            const isMissingMetadata = linkability === ExpandedDocLinkability.EsqlMissingMetadata;
            const metadataExample =
              isMissingMetadata && isOfAggregateQueryType(query)
                ? getEsqlMissingMetadataExample(query.esql)
                : undefined;

            toastNotifications.addWarning({
              title: i18n.translate('discover.docViews.flyout.copyLinkUnavailableTitle', {
                defaultMessage: 'Cannot share direct link',
              }),
              text: metadataExample
                ? toMountPoint(<EsqlMissingMetadataToastText example={metadataExample} />, services)
                : disabledReason,
              'data-test-subj': 'discoverDocFlyoutCopyLinkWarning',
              ...(metadataExample && { toastLifeTimeMs: Infinity }),
            });
          } else {
            void copyLink();
          }
        },
      },
    ];
  }, [copyLink, linkability, query, services, toastNotifications]);
};
