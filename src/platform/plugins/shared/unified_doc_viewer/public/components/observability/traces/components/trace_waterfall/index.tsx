/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useCallback, useState } from 'react';
import { EuiButtonEmpty, EuiDelayRender, EuiLink, EuiTourStep, useEuiTheme } from '@elastic/eui';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { FormattedMessage } from '@kbn/i18n-react';
import { ContentFrameworkSection } from '../../../../..';
import { getUnifiedDocViewerServices } from '../../../../../plugin';
import { FullScreenWaterfall } from '../full_screen_waterfall';

interface Props {
  traceId: string;
  docId?: string;
  serviceName?: string;
  dataView: DocViewRenderProps['dataView'];
}

const fullScreenButtonLabel = i18n.translate(
  'unifiedDocViewer.observability.traces.trace.fullScreen.button',
  { defaultMessage: 'Expand trace timeline' }
);

const sectionTip = i18n.translate('unifiedDocViewer.observability.traces.trace.description', {
  defaultMessage: 'Timeline of all spans in the trace, including their duration and hierarchy.',
});

const sectionTitle = i18n.translate('unifiedDocViewer.observability.traces.trace.title', {
  defaultMessage: 'Trace',
});

export const tourStepTitle = i18n.translate(
  'unifiedDocViewer.observability.traces.trace.tourStep.title',
  { defaultMessage: 'Trace insights in Discover' }
);

export const tourStepSubtitle = i18n.translate(
  'unifiedDocViewer.observability.traces.trace.tourStep.subtitle',
  { defaultMessage: 'New discover feature' }
);

export const tourStepOkButtonAriaLabel = i18n.translate(
  'unifiedDocViewer.contentFramework.section.tourStep.okButton',
  {
    defaultMessage: 'Close {action} tour',
    values: { action: fullScreenButtonLabel },
  }
);

export const tourStepOkButtonLabel = i18n.translate(
  'unifiedDocViewer.contentFramework.section.tourStep.okButtonLabel',
  { defaultMessage: 'OK' }
);

const fullscreenWaterfallTourStorageKey = 'fullscreenWaterfallTourDismissed';

export function TraceWaterfall({ traceId, docId, serviceName, dataView }: Props) {
  const { data } = getUnifiedDocViewerServices();
  const { euiTheme } = useEuiTheme();
  const [showFullScreenWaterfall, setShowFullScreenWaterfall] = useState(false);
  const [dismissedActionTour, setDismissedActionTour] = useLocalStorage<boolean>(
    fullscreenWaterfallTourStorageKey,
    false
  );

  const { from: rangeFrom, to: rangeTo } = data.query.timefilter.timefilter.getAbsoluteTime();
  const getParentApi = useCallback(
    () => ({
      getSerializedStateForChild: () => ({
        rawState: {
          traceId,
          rangeFrom,
          rangeTo,
          docId,
          mode: 'summary',
        },
      }),
    }),
    [docId, rangeFrom, rangeTo, traceId]
  );

  const actionId = 'traceWaterfallFullScreenAction';
  const renderTourStep = (
    <EuiTourStep
      anchor={`#${actionId}`}
      content={
        <>
          <FormattedMessage
            id="unifiedDocViewer.observability.traces.trace.tourStep.content"
            defaultMessage="You can now click {link} to view the full-screen waterfall and explore your trace data in context."
            values={{
              link: (
                <EuiLink
                  data-test-subj="traceWaterfallFullScreenActionTourLink"
                  onClick={() => setShowFullScreenWaterfall(true)}
                  aria-label={fullScreenButtonLabel}
                >
                  {fullScreenButtonLabel}
                </EuiLink>
              ),
            }}
          />
        </>
      }
      isStepOpen={!dismissedActionTour}
      maxWidth={350}
      onFinish={() => {}}
      step={1}
      stepsTotal={1}
      title={tourStepTitle}
      subtitle={tourStepSubtitle}
      footerAction={
        <EuiButtonEmpty
          aria-label={tourStepOkButtonAriaLabel}
          onClick={() => {
            setDismissedActionTour(true);
          }}
        >
          {tourStepOkButtonAriaLabel}
        </EuiButtonEmpty>
      }
      zIndex={Number(euiTheme.levels.flyout)}
    />
  );

  return (
    <>
      {showFullScreenWaterfall ? (
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
      ) : null}
      <ContentFrameworkSection
        id="trace-waterfall"
        title={sectionTitle}
        description={sectionTip}
        actions={[
          {
            icon: 'fullScreen',
            onClick: () => setShowFullScreenWaterfall(true),
            label: fullScreenButtonLabel,
            ariaLabel: fullScreenButtonLabel,
            id: actionId,
          },
        ]}
      >
        <EmbeddableRenderer
          type="APM_TRACE_WATERFALL_EMBEDDABLE"
          getParentApi={getParentApi}
          hidePanelChrome
        />
        <EuiDelayRender delay={500}>{renderTourStep}</EuiDelayRender>
      </ContentFrameworkSection>
    </>
  );
}
