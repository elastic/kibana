/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  useEuiTour,
  EuiStatelessTourStep,
  EuiTourState,
  EuiTourStep,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
} from '@elastic/eui';
import {
  DocumentExplorerTourContext,
  DocumentExplorerTourContextProps,
  useDocumentExplorerTourContext,
} from './document_explorer_tour_context';

const STEP_COLUMNS = 1;
const STEP_SORTING = 2;
const STEP_ROW_HEIGHT = 3;
const STEP_EXPAND = 4;

const tourSteps = [
  {
    step: STEP_COLUMNS,
    anchorPosition: 'upLeft',
    title: i18n.translate('discover.docExplorerTour.stepAddFieldsTitle', {
      defaultMessage: 'Add fields to the table',
    }),
    content: (
      <p>
        <FormattedMessage
          id="discover.docExplorerTour.stepAddFieldsDescription"
          defaultMessage="Add the fields relevant to you, then drag the columns to your preferred order."
        />
      </p>
    ),
  },
  {
    step: STEP_SORTING,
    title: i18n.translate('discover.docExplorerTour.stepSortFieldsTitle', {
      defaultMessage: 'Sort on multiple fields',
    }),
    content: (
      <p>
        <FormattedMessage
          id="discover.docExplorerTour.stepSortFieldsDescription"
          defaultMessage="Find all your sorting needs in the fields sorted pop-up. Reorder the sort using drag and drop."
        />
      </p>
    ),
  },
  {
    step: STEP_ROW_HEIGHT,
    title: i18n.translate('discover.docExplorerTour.stepChangeRowHeightTitle', {
      defaultMessage: 'Change the row height',
    }),
    content: (
      <p>
        <FormattedMessage
          id="discover.docExplorerTour.stepChangeRowHeightDescription"
          defaultMessage="Specify the number of lines per row, or automatically adjust the height to fit the contents."
        />
      </p>
    ),
  },
  {
    step: STEP_EXPAND,
    title: i18n.translate('discover.docExplorerTour.stepExpandTitle', {
      defaultMessage: 'Expand and compare',
    }),
    content: (
      <p>
        <FormattedMessage
          id="discover.docExplorerTour.stepExpandDescription"
          defaultMessage="Expand a document to inspect its fields, set filters, and view the documents before and after. Interested in specific documents only? Select them, and then use the selected documents dropdown."
        />
      </p>
    ),
  },
] as EuiStatelessTourStep[];

const FIRST_STEP = tourSteps[0].step;
const LAST_STEP = tourSteps[tourSteps.length - 1].step;

const tourConfig: EuiTourState = {
  currentTourStep: FIRST_STEP,
  isTourActive: false,
  tourPopoverWidth: 350,
  tourSubtitle: i18n.translate('discover.docExplorerTour.tourTitle', {
    defaultMessage: 'Document Explorer',
  }),
};

export const DocumentExplorerTourProvider: React.FC = ({ children }) => {
  const [steps, actions, reducerState] = useEuiTour(tourSteps, tourConfig);
  const currentTourStep = reducerState.currentTourStep;

  const onStartTour = useCallback(() => {
    actions.resetTour();
    actions.goToStep(FIRST_STEP, true);
  }, [actions]);

  const onNextTourStep = useCallback(() => {
    if (currentTourStep === LAST_STEP) {
      actions.finishTour();
    } else {
      actions.incrementStep();
    }
  }, [actions, currentTourStep]);

  const onFinishTour = useCallback(() => {
    actions.finishTour();
  }, [actions]);

  const contextValue: DocumentExplorerTourContextProps = useMemo(
    () => ({
      onStartTour,
      onNextTourStep,
      onFinishTour,
      getStepProps: (step) => ({
        ...(steps.find((s) => s.step === step) || {}),
        footerAction: (
          <DocumentExplorerTourFooterAction
            step={step}
            onNextTourStep={onNextTourStep}
            onFinishTour={onFinishTour}
          />
        ),
      }),
    }),
    [steps, onStartTour, onNextTourStep, onFinishTour]
  );

  return (
    <DocumentExplorerTourContext.Provider value={contextValue}>
      {children}
    </DocumentExplorerTourContext.Provider>
  );
};

export const DocumentExplorerTourStepColumns: React.FC = ({ children }) => {
  const tourContext = useDocumentExplorerTourContext();

  return (
    <EuiTourStep {...tourContext.getStepProps(STEP_COLUMNS)}>
      <div />
    </EuiTourStep>
  );
};

export const DocumentExplorerTourFooterAction: React.FC<{
  step: number;
  onNextTourStep: DocumentExplorerTourContextProps['onNextTourStep'];
  onFinishTour: DocumentExplorerTourContextProps['onFinishTour'];
}> = ({ step, onNextTourStep, onFinishTour }) => {
  const isLastStep = step === LAST_STEP;

  return (
    <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
      {!isLastStep && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty color="text" size="xs" onClick={onFinishTour}>
            <FormattedMessage id="discover.docExplorerTour.skipButton" defaultMessage="Skip tour" />
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiButton size="s" color="success" onClick={isLastStep ? onFinishTour : onNextTourStep}>
          {isLastStep ? (
            <FormattedMessage id="discover.docExplorerTour.finishButton" defaultMessage="Finish" />
          ) : (
            <FormattedMessage id="discover.docExplorerTour.nextButton" defaultMessage="Next" />
          )}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
