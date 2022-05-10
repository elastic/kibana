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
  EuiTourState,
  EuiTourStep,
  EuiTourStepProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiButtonProps,
  EuiImage,
  EuiSpacer,
  EuiI18n,
  EuiIcon,
} from '@elastic/eui';
import { PLUGIN_ID } from '../../../common';
import { useDiscoverServices } from '../../utils/use_discover_services';
import { DiscoverTourContext, DiscoverTourContextProps } from './discover_tour_context';
import { DISCOVER_TOUR_STEP_ANCHORS } from './discover_tour_anchors';

const MAX_WIDTH = 350;

interface TourStepDefinition {
  anchor: EuiTourStepProps['anchor'];
  anchorPosition: EuiTourStepProps['anchorPosition'];
  title: EuiTourStepProps['title'];
  content: EuiTourStepProps['content'];
  imageName: string;
  imageAltText: string;
}

const tourStepDefinitions: TourStepDefinition[] = [
  {
    anchor: DISCOVER_TOUR_STEP_ANCHORS.addFields,
    anchorPosition: 'rightCenter',
    title: i18n.translate('discover.dscTour.stepAddFields.title', {
      defaultMessage: 'Add fields to the table',
    }),
    content: (
      <FormattedMessage
        id="discover.dscTour.stepAddFields.description"
        defaultMessage="Click {plusIcon} to add the fields that interest you."
        values={{
          plusIcon: <EuiIcon size="s" type="plusInCircleFilled" color="primary" aria-label="+" />,
        }}
      />
    ),
    imageName: 'add_fields.gif',
    imageAltText: i18n.translate('discover.dscTour.stepAddFields.imageAltText', {
      defaultMessage:
        'In the Available fields list, click the plus icon to toggle a field into the document table.',
    }),
  },
  {
    anchor: DISCOVER_TOUR_STEP_ANCHORS.reorderColumns,
    anchorPosition: 'upCenter',
    title: i18n.translate('discover.dscTour.stepReorderColumns.title', {
      defaultMessage: 'Order columns',
    }),
    content: (
      <FormattedMessage
        id="discover.dscTour.stepReorderColumns.description"
        defaultMessage="Order your columns however you want."
      />
    ),
    imageName: 'reorder_columns.gif',
    imageAltText: i18n.translate('discover.dscTour.stepReorderColumns.imageAltText', {
      defaultMessage: 'Use the Columns pop-up to drag the columns to the order you prefer.',
    }),
  },
  {
    anchor: DISCOVER_TOUR_STEP_ANCHORS.sort,
    anchorPosition: 'upCenter',
    title: i18n.translate('discover.dscTour.stepSort.title', {
      defaultMessage: 'Sort on one or more fields',
    }),
    content: (
      <FormattedMessage
        id="discover.dscTour.stepSort.description"
        defaultMessage="Sort a single field by clicking a column header. Sort by multiple fields using the pop-up."
      />
    ),
    imageName: 'sort.gif',
    imageAltText: i18n.translate('discover.dscTour.stepSort.imageAltText', {
      defaultMessage:
        'Click a column header and select the desired sort order. Adjust a multi-field sort using the fields sorted pop-up.',
    }),
  },
  {
    anchor: DISCOVER_TOUR_STEP_ANCHORS.changeRowHeight,
    anchorPosition: 'upCenter',
    title: i18n.translate('discover.dscTour.stepChangeRowHeight.title', {
      defaultMessage: 'Change the row height',
    }),
    content: (
      <FormattedMessage
        id="discover.dscTour.stepChangeRowHeight.description"
        defaultMessage="Adjust the number of lines to fit the contents."
      />
    ),
    imageName: 'rows_per_line.gif',
    imageAltText: i18n.translate('discover.dscTour.stepChangeRowHeight.imageAltText', {
      defaultMessage:
        'Click the display options icon to adjust the row height to fit the contents.',
    }),
  },
  {
    anchor: DISCOVER_TOUR_STEP_ANCHORS.expandDocument,
    anchorPosition: 'upCenter',
    title: i18n.translate('discover.dscTour.stepExpand.title', {
      defaultMessage: 'Expand documents',
    }),
    content: (
      <FormattedMessage
        id="discover.dscTour.stepExpand.description"
        defaultMessage="Click {expandIcon} to inspect fields, set filters, and view the documents that came before and after it."
        values={{
          expandIcon: (
            <EuiIcon
              size="s"
              type="expand"
              color="text"
              aria-label={i18n.translate('discover.dscTour.stepExpand.expandIconAriaLabel', {
                defaultMessage: 'Expand icon',
              })}
            />
          ),
        }}
      />
    ),
    imageName: 'expand.gif',
    imageAltText: i18n.translate('discover.dscTour.stepExpand.imageAltText', {
      defaultMessage:
        'Click the expand icon to inspect and filter the fields in the document and view the document in context.',
    }),
  },
];

const FIRST_STEP = 1;

const prepareTourSteps = (
  stepDefinitions: TourStepDefinition[],
  getAssetPath: (imageName: string) => string
): EuiTourStepProps[] =>
  stepDefinitions.map((stepDefinition, index) => ({
    step: index + 1,
    anchor: stepDefinition.anchor,
    anchorPosition: stepDefinition.anchorPosition,
    title: stepDefinition.title,
    maxWidth: MAX_WIDTH,
    content: (
      <>
        <p>{stepDefinition.content}</p>
        {stepDefinition.imageName && (
          <>
            <EuiSpacer size="s" />
            <EuiImage
              alt={stepDefinition.imageAltText}
              src={getAssetPath(stepDefinition.imageName)}
              size={300}
            />
          </>
        )}
      </>
    ),
  })) as EuiTourStepProps[];

const findNextAvailableStep = (
  steps: EuiTourStepProps[],
  currentTourStep: number
): number | null => {
  const nextStep = steps.find(
    (step) =>
      step.step > currentTourStep &&
      typeof step.anchor === 'string' &&
      document.querySelector(step.anchor)
  );

  return nextStep?.step ?? null;
};

const tourConfig: EuiTourState = {
  currentTourStep: FIRST_STEP,
  isTourActive: false,
  tourPopoverWidth: MAX_WIDTH,
  tourSubtitle: '',
};

export const DiscoverTourProvider: React.FC = ({ children }) => {
  const services = useDiscoverServices();
  const prependToBasePath = services.core.http.basePath.prepend;
  const getAssetPath = useCallback(
    (imageName: string) => {
      // TODO: update dir name
      return prependToBasePath(`/plugins/${PLUGIN_ID}/assets/dsc_tour/${imageName}`);
    },
    [prependToBasePath]
  );
  const tourSteps = useMemo(
    () => prepareTourSteps(tourStepDefinitions, getAssetPath),
    [getAssetPath]
  );
  const [steps, actions, reducerState] = useEuiTour(tourSteps, tourConfig);
  const currentTourStep = reducerState.currentTourStep;
  const isTourActive = reducerState.isTourActive;

  const onStartTour = useCallback(() => {
    actions.resetTour();
    actions.goToStep(FIRST_STEP, true);
  }, [actions]);

  const onNextTourStep = useCallback(() => {
    const nextAvailableStep = findNextAvailableStep(steps, currentTourStep);
    if (nextAvailableStep) {
      actions.goToStep(nextAvailableStep);
    } else {
      actions.finishTour();
    }
  }, [actions, steps, currentTourStep]);

  const onFinishTour = useCallback(() => {
    actions.finishTour();
  }, [actions]);

  const contextValue: DiscoverTourContextProps = useMemo(
    () => ({
      onStartTour,
      onNextTourStep,
      onFinishTour,
    }),
    [onStartTour, onNextTourStep, onFinishTour]
  );

  return (
    <DiscoverTourContext.Provider value={contextValue}>
      {isTourActive &&
        steps.map((step) => (
          <EuiTourStep
            key={`step-${step.step}-is-${String(step.isStepOpen)}`}
            {...step}
            footerAction={
              <DiscoverTourStepFooterAction
                isLastStep={step.step === steps[steps.length - 1].step}
                onNextTourStep={onNextTourStep}
                onFinishTour={onFinishTour}
              />
            }
          />
        ))}
      {children}
    </DiscoverTourContext.Provider>
  );
};

export const DiscoverTourStepFooterAction: React.FC<{
  isLastStep: boolean;
  onNextTourStep: DiscoverTourContextProps['onNextTourStep'];
  onFinishTour: DiscoverTourContextProps['onFinishTour'];
}> = ({ isLastStep, onNextTourStep, onFinishTour }) => {
  const actionButtonProps: Partial<EuiButtonProps> = {
    size: 's',
    color: 'success',
  };

  return (
    <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
      {!isLastStep && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            color="text"
            size="xs"
            onClick={onFinishTour}
            data-test-subj="discoverTourButtonSkip"
          >
            {EuiI18n({ token: 'core.euiTourStep.skipTour', default: 'Skip tour' })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        {isLastStep ? (
          <EuiButton
            {...actionButtonProps}
            onClick={onFinishTour}
            data-test-subj="discoverTourButtonEnd"
          >
            {EuiI18n({ token: 'core.euiTourStep.endTour', default: 'End tour' })}
          </EuiButton>
        ) : (
          <EuiButton
            {...actionButtonProps}
            onClick={onNextTourStep}
            data-test-subj="discoverTourButtonNext"
          >
            {EuiI18n({ token: 'core.euiTourStep.nextStep', default: 'Next' })}
          </EuiButton>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
