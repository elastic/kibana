/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTab, EuiTabs } from '@elastic/eui';
import type { DetailViewData } from './types';
import { getNextTab } from './get_next_tab';
import { Request } from '../../../../common/adapters/request/types';

import {
  ClustersView,
  RequestDetailsRequest,
  RequestDetailsResponse,
  RequestDetailsStats,
} from './details';

interface Props {
  initialTabs?: string[];
  request: Request;
}

const DETAILS: DetailViewData[] = [
  {
    name: 'Statistics',
    label: i18n.translate('inspector.requests.statisticsTabLabel', {
      defaultMessage: 'Statistics',
    }),
    component: RequestDetailsStats,
  },
  {
    name: 'Clusters',
    label: i18n.translate('inspector.requests.clustersTabLabel', {
      defaultMessage: 'Clusters and shards',
    }),
    component: ClustersView,
  },
  {
    name: 'Request',
    label: i18n.translate('inspector.requests.requestTabLabel', {
      defaultMessage: 'Request',
    }),
    component: RequestDetailsRequest,
  },
  {
    name: 'Response',
    label: i18n.translate('inspector.requests.responseTabLabel', {
      defaultMessage: 'Response',
    }),
    component: RequestDetailsResponse,
  },
];

export function RequestDetails(props: Props) {
  const [availableDetails, setAvailableDetails] = useState<DetailViewData[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<DetailViewData | null>(null);

  useEffect(() => {
    const nextAvailableDetails = DETAILS.filter((detail: DetailViewData) =>
      detail.component.shouldShow?.(props.request)
    );
    setAvailableDetails(nextAvailableDetails);

    // If the previously selected detail is still available we want to stay
    // on this tab and not set another selectedDetail.
    if (selectedDetail && nextAvailableDetails.find(({ name }) => name === selectedDetail.name)) {
      return;
    }

    setSelectedDetail(getNextTab(selectedDetail, nextAvailableDetails, props.initialTabs));

    // do not re-run on selectedDetail change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.initialTabs, props.request]);

  return selectedDetail ? (
    <>
      <EuiTabs size="s">
        {availableDetails.map((detail) => (
          <EuiTab
            key={detail.name}
            isSelected={detail.name === selectedDetail.name}
            onClick={() => {
              if (detail.name !== selectedDetail.name) {
                setSelectedDetail(detail);
              }
            }}
            data-test-subj={`inspectorRequestDetail${detail.name}`}
          >
            {detail.label}
          </EuiTab>
        ))}
      </EuiTabs>
      <selectedDetail.component key={props.request.id} request={props.request} />
    </>
  ) : null;
}
