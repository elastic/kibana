/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiTourStep, EuiLink, EuiButtonEmpty, useEuiTheme } from '@elastic/eui';
import useLocalStorage from 'react-use/lib/useLocalStorage';

const tourStepTitle = i18n.translate('unifiedDocViewer.observability.traces.trace.tourStep.title', {
  defaultMessage: 'Trace insights in Discover',
});

const tourStepSubtitle = i18n.translate(
  'unifiedDocViewer.observability.traces.trace.tourStep.subtitle',
  { defaultMessage: 'New discover feature' }
);

const tourStepOkButtonAriaLabel = (fullScreenButtonLabel: string) => {
  return i18n.translate('unifiedDocViewer.contentFramework.section.tourStep.okButton', {
    defaultMessage: 'Close {action} tour',
    values: { action: fullScreenButtonLabel },
  });
};

const tourStepOkButtonLabel = i18n.translate(
  'unifiedDocViewer.contentFramework.section.tourStep.okButtonLabel',
  { defaultMessage: 'OK' }
);

const fullscreenWaterfallTourStorageKey = 'fullscreenWaterfallTourDismissed';

interface TraceWaterfallTourStepProps {
  actionId: string;
  fullScreenButtonLabel: string;
  onFullScreenLinkClick: () => void;
}

export const TraceWaterfallTourStep = ({
  actionId,
  fullScreenButtonLabel,
  onFullScreenLinkClick,
}: TraceWaterfallTourStepProps) => {
  const { euiTheme } = useEuiTheme();
  const [dismissedActionTour, setDismissedActionTour] = useLocalStorage<boolean>(
    fullscreenWaterfallTourStorageKey,
    false
  );

  return (
    <EuiTourStep
      anchor={`#${actionId}`}
      content={
        <FormattedMessage
          id="unifiedDocViewer.observability.traces.trace.tourStep.content"
          defaultMessage="You can now click {link} to view the full-screen waterfall and explore your trace data in context."
          values={{
            link: (
              <EuiLink
                data-test-subj="traceWaterfallFullScreenActionTourLink"
                onClick={onFullScreenLinkClick}
                aria-label={fullScreenButtonLabel}
              >
                {fullScreenButtonLabel}
              </EuiLink>
            ),
          }}
        />
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
          aria-label={tourStepOkButtonAriaLabel(fullScreenButtonLabel)}
          data-test-subj="traceWaterfallFullScreenActionTourOkButton"
          onClick={() => {
            setDismissedActionTour(true);
          }}
        >
          {tourStepOkButtonLabel}
        </EuiButtonEmpty>
      }
      zIndex={Number(euiTheme.levels.flyout)}
    />
  );
};
