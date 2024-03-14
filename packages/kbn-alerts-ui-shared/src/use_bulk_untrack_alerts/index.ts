/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { ToastsStart, HttpStart } from '@kbn/core/public';
import { useMutation, ContextOptions } from '@tanstack/react-query';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ValidFeatureId, ALERT_UUID } from '@kbn/rule-data-utils';

export const INTERNAL_BASE_ALERTING_API_PATH = '/internal/alerting';

const BULK_UNTRACK_SUCCESS_MESSAGE = (uuidsCount: number) =>
  i18n.translate('alertsUIShared.hooks.untrack.successMessage', {
    defaultMessage: 'Untracked {uuidsCount, plural, one {alert} other {alerts}}',
    values: { uuidsCount },
  });

const BULK_UNTRACK_ERROR_MESSAGE = (uuidsCount: number) =>
  i18n.translate('alertsUIShared.hooks.untrack.failedMessage', {
    defaultMessage: 'Failed to untrack {uuidsCount, plural, one {alert} other {alerts}}',
    values: { uuidsCount },
  });

const BULK_UNTRACK_ALL_SUCCESS_MESSAGE = i18n.translate(
  'alertsUIShared.hooks.untrackAll.successMessage',
  {
    defaultMessage: 'Untracked alerts',
  }
);

const BULK_UNTRACK_ALL_ERROR_MESSAGE = i18n.translate(
  'alertsUIShared.hooks.untrackAll.failedMessage',
  {
    defaultMessage: 'Failed to untrack alerts by query',
  }
);

const getQuery = ({
  query,
  alertUuids,
}: {
  query?: Pick<QueryDslQueryContainer, 'bool' | 'ids'>;
  alertUuids?: string[];
}) => {
  const arrayifiedQuery = Array.isArray(query) ? query : [query];

  if (alertUuids) {
    arrayifiedQuery.push({
      bool: {
        should: alertUuids.map((alertId) => ({
          term: {
            [ALERT_UUID]: { value: alertId },
          },
        })),
      },
    });
  }

  return arrayifiedQuery.filter((q) => q);
};

interface UseBulkUntrackAlerts {
  http: HttpStart;
  toasts: ToastsStart;
  context?: ContextOptions['context'];
}

export const useBulkUntrackAlerts = (options: UseBulkUntrackAlerts) => {
  const { context, http, toasts } = options || {};

  const untrackAlerts = useMutation<
    string,
    string,
    {
      query?: Pick<QueryDslQueryContainer, 'bool' | 'ids'>;
      featureIds: ValidFeatureId[];
      alertUuids?: string[];
    }
  >(
    ['untrackAlerts'],
    ({ query, featureIds, alertUuids = [] }) => {
      try {
        const body = JSON.stringify({
          query: getQuery({ query, alertUuids }),
          feature_ids: featureIds,
        });
        return http.post(`${INTERNAL_BASE_ALERTING_API_PATH}/alerts/_bulk_untrack`, {
          body,
        });
      } catch (e) {
        throw new Error(`Unable to parse bulk untrack params: ${e}`);
      }
    },
    {
      context,
      onError: (_err, params) => {
        if (params.alertUuids) {
          toasts.addDanger(BULK_UNTRACK_ERROR_MESSAGE(params.alertUuids.length));
        } else {
          toasts.addDanger(BULK_UNTRACK_ALL_ERROR_MESSAGE);
        }
      },

      onSuccess: (_, params) => {
        if (params.alertUuids) {
          toasts.addSuccess(BULK_UNTRACK_SUCCESS_MESSAGE(params.alertUuids.length));
        } else {
          toasts.addSuccess(BULK_UNTRACK_ALL_SUCCESS_MESSAGE);
        }
      },
    }
  );

  return untrackAlerts;
};
