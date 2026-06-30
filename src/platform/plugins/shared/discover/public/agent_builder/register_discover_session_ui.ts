/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { ApplicationStart } from '@kbn/core/public';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { DiscoverAppLocator, DiscoverAppLocatorParams } from '../../common';
import {
  DISCOVER_SESSION_ATTACHMENT_TYPE,
  type DiscoverSessionAttachmentData,
} from '../../common/discover_session_attachment';

const isDiscoverSessionAttachmentData = (data: unknown): data is DiscoverSessionAttachmentData => {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const candidate = data as DiscoverSessionAttachmentData;
  return typeof candidate.dataViewTitle === 'string' && typeof candidate.queryLanguage === 'string';
};

const toLocatorQuery = (
  query: string | undefined,
  queryLanguage: string
): DiscoverAppLocatorParams['query'] | undefined => {
  if (!query) {
    return undefined;
  }

  if (queryLanguage === 'esql') {
    return { esql: query };
  }

  return {
    language: queryLanguage === 'lucene' ? 'lucene' : 'kuery',
    query,
  };
};

const getDiscoverSessionLocatorParams = (
  data: DiscoverSessionAttachmentData
): DiscoverAppLocatorParams => {
  if (data.savedSearchId) {
    return { savedSearchId: data.savedSearchId };
  }

  const params: DiscoverAppLocatorParams = {
    dataViewId: data.dataViewId,
    query: toLocatorQuery(data.query, data.queryLanguage),
    columns: data.columns,
    timeRange: data.timeRange,
  };

  if (data.tabId) {
    params.tab = { id: data.tabId };
  }

  return params;
};

const getDiscoverSessionData = (
  attachment: Attachment
): DiscoverSessionAttachmentData | undefined => {
  return isDiscoverSessionAttachmentData(attachment.data) ? attachment.data : undefined;
};

export const registerDiscoverSessionAttachmentUi = ({
  agentBuilder,
  locator,
  application,
}: {
  agentBuilder: AgentBuilderPluginStart;
  locator: DiscoverAppLocator;
  application: ApplicationStart;
}) => {
  agentBuilder.attachments.addAttachmentType(DISCOVER_SESSION_ATTACHMENT_TYPE, {
    getLabel: (attachment: Attachment) => {
      const data = getDiscoverSessionData(attachment);
      if (data?.sessionTitle) {
        return data.sessionTitle;
      }
      if (data?.dataViewTitle) {
        return data.dataViewTitle;
      }
      return i18n.translate('discover.agentBuilder.discoverSessionAttachmentLabelDefault', {
        defaultMessage: 'Discover session',
      });
    },
    getTypeLabel: () =>
      i18n.translate('discover.agentBuilder.discoverSessionAttachmentTypeLabel', {
        defaultMessage: 'Discover',
      }),
    getIcon: () => 'documents',
    getHeader: ({ attachment }) => {
      const data = getDiscoverSessionData(attachment);
      if (!data) {
        return {};
      }

      const subtitleParts = [data.queryLanguage];
      if (data.timeRange) {
        subtitleParts.push(`${data.timeRange.from} → ${data.timeRange.to}`);
      }

      return {
        subtitle: subtitleParts.join(' · '),
      };
    },
    getActionButtons: ({ attachment }) => {
      const data = getDiscoverSessionData(attachment);
      if (!data) {
        return [];
      }

      return [
        {
          label: i18n.translate('discover.agentBuilder.discoverSessionOpenActionLabel', {
            defaultMessage: 'Open in Discover',
          }),
          icon: 'inspect',
          type: ActionButtonType.PRIMARY,
          handler: async () => {
            const { app, path, state } = await locator.getLocation(
              getDiscoverSessionLocatorParams(data)
            );
            await application.navigateToApp(app, { path, state });
          },
        },
      ];
    },
  });
};
