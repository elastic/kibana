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
  EuiImage,
  EuiSpacer,
} from '@elastic/eui';
import {
  DocumentExplorerTourContext,
  DocumentExplorerTourContextProps,
  useDocumentExplorerTourContext,
} from './document_explorer_tour_context';

import reorderColumnsGif from './assets/reorder_columns.gif';
import rowsPerLineGif from './assets/rows_per_line.gif';
import expandDocumentGif from './assets/expand_document.gif';

const STEP_COLUMNS = 1;
const STEP_SORTING = 2;
const STEP_ROW_HEIGHT = 3;
const STEP_EXPAND = 4;

const MAX_WIDTH = 350;

const tourSteps = [
  {
    step: STEP_COLUMNS,
    maxWidth: MAX_WIDTH,
    anchorPosition: 'upCenter',
    title: i18n.translate('discover.docExplorerTour.stepAddFieldsTitle', {
      defaultMessage: 'Add fields to the table',
    }),
    content: (
      <>
        <FormattedMessage
          id="discover.docExplorerTour.stepAddFieldsDescription"
          defaultMessage="Add the fields relevant to you, then drag the columns to your preferred order."
        />
        <EuiSpacer size="s" />
        <EuiImage alt="TODO" src={reorderColumnsGif} />
      </>
    ),
  },
  {
    step: STEP_SORTING,
    maxWidth: MAX_WIDTH,
    anchorPosition: 'rightUp',
    title: i18n.translate('discover.docExplorerTour.stepSortFieldsTitle', {
      defaultMessage: 'Sort on multiple fields',
    }),
    content: (
      <FormattedMessage
        id="discover.docExplorerTour.stepSortFieldsDescription"
        defaultMessage="Find all your sorting needs in the fields sorted pop-up. Reorder the sort using drag and drop."
      />
    ),
  },
  {
    step: STEP_ROW_HEIGHT,
    maxWidth: MAX_WIDTH,
    anchorPosition: 'leftUp',
    title: i18n.translate('discover.docExplorerTour.stepChangeRowHeightTitle', {
      defaultMessage: 'Change the row height',
    }),
    content: (
      <>
        <FormattedMessage
          id="discover.docExplorerTour.stepChangeRowHeightDescription"
          defaultMessage="Specify the number of lines per row, or automatically adjust the height to fit the contents."
        />
        <EuiSpacer size="s" />
        <EuiImage alt="TODO" src={rowsPerLineGif} />
      </>
    ),
  },
  {
    step: STEP_EXPAND,
    maxWidth: MAX_WIDTH,
    anchorPosition: 'rightUp',
    title: i18n.translate('discover.docExplorerTour.stepExpandTitle', {
      defaultMessage: 'Expand and compare',
    }),
    content: (
      <>
        <FormattedMessage
          id="discover.docExplorerTour.stepExpandDescription"
          defaultMessage="Expand a document to inspect its fields, set filters, and view the documents before and after. Interested in specific documents only? Select them, and then use the selected documents dropdown."
        />
        <EuiSpacer size="s" />
        <EuiImage alt="TODO" src={expandDocumentGif} />
      </>
    ),
  },
] as EuiStatelessTourStep[];

const FIRST_STEP = tourSteps[0].step;
const LAST_STEP = tourSteps[tourSteps.length - 1].step;

const tourConfig: EuiTourState = {
  currentTourStep: FIRST_STEP,
  isTourActive: false,
  tourPopoverWidth: MAX_WIDTH,
  tourSubtitle: i18n.translate('discover.docExplorerTour.tourTitle', {
    defaultMessage: 'Document Explorer',
  }),
};

export const DocumentExplorerTourProvider: React.FC = ({ children }) => {
  const [steps, actions] = useEuiTour(tourSteps, tourConfig);

  const onStartTour = useCallback(() => {
    actions.resetTour();
    actions.goToStep(FIRST_STEP, true);
  }, [actions]);

  const onNextTourStep = useCallback(() => {
    actions.incrementStep();
  }, [actions]);

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

export const DocumentExplorerTourStepColumns: React.FC<{ anchorSelector: string }> = ({
  anchorSelector,
}) => {
  const tourContext = useDocumentExplorerTourContext();

  return <EuiTourStep {...tourContext.getStepProps(STEP_COLUMNS)} anchor={anchorSelector} />;
};

export const DocumentExplorerTourStepSorting: React.FC = () => {
  const tourContext = useDocumentExplorerTourContext();

  return (
    <EuiTourStep {...tourContext.getStepProps(STEP_SORTING)}>
      <div />
    </EuiTourStep>
  );
};

export const DocumentExplorerTourStepRowHeight: React.FC = () => {
  const tourContext = useDocumentExplorerTourContext();

  return (
    <EuiTourStep {...tourContext.getStepProps(STEP_ROW_HEIGHT)}>
      <div />
    </EuiTourStep>
  );
};

export const DocumentExplorerTourStepExpand: React.FC = ({ children }) => {
  const tourContext = useDocumentExplorerTourContext();

  return (
    <EuiTourStep {...tourContext.getStepProps(STEP_EXPAND)}>
      <>{children}</>
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
