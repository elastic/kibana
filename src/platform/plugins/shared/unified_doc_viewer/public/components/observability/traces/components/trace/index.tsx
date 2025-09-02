/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { SERVICE_NAME, SPAN_ID, TRACE_ID, TRANSACTION_ID } from '@kbn/apm-types';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { ContentFrameworkTable } from '../../../../content_framework';
import { ContentFrameworkSection } from '../../../../content_framework/section';
import { getUnifiedDocViewerServices } from '../../../../../plugin';
import { FullScreenWaterfall } from '../full_screen_waterfall';
import { traceFieldConfigurations } from './field_configurations';
import { isTransaction } from '../../helpers';

const fullScreenButtonLabel = i18n.translate(
  'unifiedDocViewer.observability.traces.trace.fullScreen.button',
  {
    defaultMessage: 'Expand trace timeline',
  }
);

const sectionTip = i18n.translate('unifiedDocViewer.observability.traces.trace.description', {
  defaultMessage:
    'Trace attributes and a timeline of all spans in the trace, including their duration and hierarchy.',
});

export interface TraceProps
  extends Pick<DocViewRenderProps, 'filter' | 'onAddColumn' | 'onRemoveColumn'> {
  hit: DataTableRecord;
  dataView: DocViewRenderProps['dataView'];
  showWaterfall?: boolean;
}

export const Trace = ({
  hit,
  dataView,
  filter,
  onAddColumn,
  onRemoveColumn,
  showWaterfall = true,
}: TraceProps) => {
  const { data } = getUnifiedDocViewerServices();
  const { euiTheme } = useEuiTheme();
  const [showFullScreenWaterfall, setShowFullScreenWaterfall] = useState(false);
  const isSpan = !isTransaction(hit);

  const traceId = hit.flattened[TRACE_ID] as string;
  const docId = hit.flattened[isSpan ? SPAN_ID : TRANSACTION_ID] as string;
  const serviceName = hit.flattened[SERVICE_NAME] as string;

  const { from: rangeFrom, to: rangeTo } = data.query.timefilter.timefilter.getAbsoluteTime();

  const getParentApi = useCallback(
    () => ({
      getSerializedStateForChild: () => ({
        rawState: {
          traceId,
          rangeFrom,
          rangeTo,
          docId,
        },
      }),
    }),
    [docId, rangeFrom, rangeTo, traceId]
  );

  const fieldNames = useMemo(() => [TRACE_ID, ...(isSpan ? [TRANSACTION_ID] : [])], [isSpan]);

  const sectionActions = useMemo(
    () =>
      showWaterfall
        ? [
            {
              label: fullScreenButtonLabel,
              icon: 'fullScreen',
              ariaLabel: fullScreenButtonLabel,
              dataTestSubj: 'unifiedDocViewerObservabilityTracesTraceFullScreenButton',
              onClick: () => {
                setShowFullScreenWaterfall(true);
              },
            },
          ]
        : [],
    [showWaterfall]
  );

  return (
    <>
      <ContentFrameworkSection
        id={'traceSection'}
        title={i18n.translate('unifiedDocViewer.observability.traces.trace.title', {
          defaultMessage: 'Trace',
        })}
        description={showWaterfall ? sectionTip : undefined}
        actions={sectionActions}
      >
        <div
          css={css`
            margin-top: calc(${euiTheme.base * -1.5}px);
          `}
        >
          <ContentFrameworkTable
            fieldNames={fieldNames}
            id={'traceTable'}
            fieldConfigurations={traceFieldConfigurations}
            dataView={dataView}
            hit={hit}
            filter={filter}
            onAddColumn={onAddColumn}
            onRemoveColumn={onRemoveColumn}
          />
        </div>

        {showWaterfall && (
          <div
            css={css`
              padding-inline: ${euiTheme.size.base};
            `}
          >
            <EmbeddableRenderer
              type="APM_TRACE_WATERFALL_EMBEDDABLE"
              getParentApi={getParentApi}
              hidePanelChrome
            />
          </div>
        )}
      </ContentFrameworkSection>

      {showFullScreenWaterfall && (
        <FullScreenWaterfall
          traceId={traceId}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          dataView={dataView}
          serviceName={serviceName}
          onExitFullScreen={() => {
            setShowFullScreenWaterfall(false);
          }}
        />
      )}
    </>
  );
};
