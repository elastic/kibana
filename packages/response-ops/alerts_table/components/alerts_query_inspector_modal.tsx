/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode } from 'react';
import {
  EuiButton,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiIconTip,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalFooter,
  EuiSpacer,
  EuiTabbedContent,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { isEmpty } from 'lodash';
import type { EsQuerySnapshot } from '@kbn/alerting-types';
import { css } from '@emotion/react';
import * as i18n from '../translations';

export interface ModalInspectProps {
  closeModal: () => void;
  alertsQuerySnapshot: EsQuerySnapshot;
  title: string;
}

interface Request {
  index: string[];
  allowNoIndices: boolean;
  ignoreUnavailable: boolean;
  body: Record<string, unknown>;
}

interface Response {
  took: number;
  timed_out: boolean;
  _shards: Record<string, unknown>;
  hits: Record<string, unknown>;
  aggregations: Record<string, unknown>;
}

const parse = function <T>(str: string): T {
  try {
    return JSON.parse(str);
  } catch {
    return {} as T;
  }
};

const stringify = (object: Request | Response): string => {
  try {
    return JSON.stringify(object, null, 2);
  } catch {
    return i18n.SOMETHING_WENT_WRONG;
  }
};

const AlertsQueryInspectorModalComponent = ({
  closeModal,
  alertsQuerySnapshot,
  title,
}: ModalInspectProps) => {
  const { request, response } = alertsQuerySnapshot;
  // using index 0 as there will be only one request and response for now
  const parsedRequest: Request = parse(request[0]);
  const parsedResponse: Response = parse(response[0]);
  const formattedRequest = stringify(parsedRequest);
  const formattedResponse = stringify(parsedResponse);

  const statistics: Array<{
    title: NonNullable<ReactNode | string>;
    description: NonNullable<ReactNode | string>;
  }> = [
    {
      title: (
        <span data-test-subj="index-pattern-title">
          {i18n.INDEX_PATTERN}{' '}
          <EuiIconTip color="subdued" content={i18n.INDEX_PATTERN_DESC} type="iInCircle" />
        </span>
      ),
      description: (
        <span data-test-subj="index-pattern-description">
          <p>{parsedRequest.index?.join(', ') ?? []}</p>
        </span>
      ),
    },

    {
      title: (
        <span data-test-subj="query-time-title">
          {i18n.QUERY_TIME}{' '}
          <EuiIconTip color="subdued" content={i18n.QUERY_TIME_DESC} type="iInCircle" />
        </span>
      ),
      description: (
        <span data-test-subj="query-time-description">
          {parsedResponse.took === 0
            ? '0ms'
            : parsedResponse.took
            ? `${numeral(parsedResponse.took).format('0,0')}ms`
            : i18n.SOMETHING_WENT_WRONG}
        </span>
      ),
    },
    {
      title: (
        <span data-test-subj="request-timestamp-title">
          {i18n.REQUEST_TIMESTAMP}{' '}
          <EuiIconTip color="subdued" content={i18n.REQUEST_TIMESTAMP_DESC} type="iInCircle" />
        </span>
      ),
      description: (
        <span data-test-subj="request-timestamp-description">{new Date().toISOString()}</span>
      ),
    },
  ];
  const tabs = [
    {
      id: 'statistics',
      name: 'Statistics',
      content: (
        <>
          <EuiSpacer />
          <EuiDescriptionList
            listItems={statistics}
            type="responsiveColumn"
            columnWidths={[3, 7]}
          />
        </>
      ),
    },
    {
      id: 'request',
      name: 'Request',
      content: (
        <>
          <EuiSpacer />
          <EuiCodeBlock
            language="js"
            fontSize="m"
            paddingSize="m"
            color="dark"
            overflowHeight={300}
            isCopyable
          >
            {isEmpty(parsedRequest) ? i18n.SOMETHING_WENT_WRONG : formattedRequest}
          </EuiCodeBlock>
        </>
      ),
    },
    {
      id: 'response',
      name: 'Response',
      content: (
        <>
          <EuiSpacer />
          <EuiCodeBlock
            language="js"
            fontSize="m"
            paddingSize="m"
            color="dark"
            overflowHeight={300}
            isCopyable
          >
            {isEmpty(parsedResponse) ? i18n.SOMETHING_WENT_WRONG : formattedResponse}
          </EuiCodeBlock>
        </>
      ),
    },
  ];

  return (
    <EuiModal
      onClose={closeModal}
      data-test-subj="modal-inspect-euiModal"
      css={css`
        width: min(768px, calc(100vw - 16px));
        min-height: 41vh;
        .euiModal__flex {
          width: 60vw;
        }
        .euiCodeBlock {
          height: auto !important;
          max-width: 718px;
        }
      `}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.INSPECT} {title}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} autoFocus="selected" />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButton onClick={closeModal} fill data-test-subj="modal-inspect-close">
          {i18n.CLOSE}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

export const AlertsQueryInspectorModal = React.memo(AlertsQueryInspectorModalComponent);
