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
  imageName?: string;
  isOptional?: boolean;
}

const tourStepDefinitions: TourStepDefinition[] = [
  {
    anchor: DISCOVER_TOUR_STEP_ANCHORS.addFields,
    anchorPosition: 'upCenter',
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
  },
  {
    anchor: DISCOVER_TOUR_STEP_ANCHORS.reorderColumns,
    anchorPosition: 'upCenter',
    title: i18n.translate('discover.dscTour.stepReorderColumns.title', {
      defaultMessage: 'Reorder columns',
    }),
    content: (
      <FormattedMessage
        id="discover.dscTour.stepReorderColumns.description"
        defaultMessage="Order your columns however you want."
      />
    ),
    imageName: 'reorder_columns.gif',
    isOptional: true,
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
  },
  {
    anchor: DISCOVER_TOUR_STEP_ANCHORS.expandDocument,
    anchorPosition: 'upCenter',
    title: i18n.translate('discover.dscTour.stepExpand.title', {
      defaultMessage: 'Compare and expand',
    }),
    content: (
      <FormattedMessage
        id="discover.dscTour.stepExpand.description"
        defaultMessage="Narrow your view by selecting specific documents. View details by clicking {expandIcon}."
        values={{
          expandIcon: (
            <EuiIcon
              size="s"
              type="expand"
              color="text"
              aria-label={i18n.translate('discover.dscTour.stepExpand.expandIconLabel', {
                defaultMessage: 'Expand icon',
              })}
            />
          ),
        }}
      />
    ),
    imageName: 'expand_document.gif',
  },
];

const FIRST_STEP = 1;

const prepareTourSteps = (
  stepDefinitions: TourStepDefinition[],
  getAssetPath: (imageName: string) => string,
  includeOptional: boolean
): EuiTourStepProps[] =>
  stepDefinitions
    .filter((stepDefinition) => includeOptional || !stepDefinition.isOptional)
    .map((stepDefinition, index) => ({
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
              <EuiImage alt="TODO" src={getAssetPath(stepDefinition.imageName)} size={300} />
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
    () => prepareTourSteps(tourStepDefinitions, getAssetPath, true),
    [getAssetPath]
  );
  const [steps, actions, reducerState] = useEuiTour(tourSteps, tourConfig);
  const currentTourStep = reducerState.currentTourStep;

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
      {steps.map((step) => (
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
  return (
    <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
      {!isLastStep && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty color="text" size="xs" onClick={onFinishTour}>
            {EuiI18n({ token: 'core.euiTourStep.skipTour', default: 'Skip tour' })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiButton size="s" color="success" onClick={isLastStep ? onFinishTour : onNextTourStep}>
          {isLastStep
            ? EuiI18n({ token: 'core.euiTourStep.endTour', default: 'End tour' })
            : EuiI18n({ token: 'core.euiTourStep.nextStep', default: 'Next' })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
