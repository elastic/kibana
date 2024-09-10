/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactElement, useCallback, useMemo } from 'react';
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
  EuiText,
} from '@elastic/eui';
import { PLUGIN_ID } from '../../../common';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { DiscoverTourContext, DiscoverTourContextProps } from './discover_tour_context';
import { DISCOVER_TOUR_STEP_ANCHORS } from './discover_tour_anchors';
import { useIsEsqlMode } from '../../application/main/hooks/use_is_esql_mode';

const MAX_WIDTH = 350;

interface TourStepDefinition {
  anchor: EuiTourStepProps['anchor'];
  title: EuiTourStepProps['title'];
  content: EuiTourStepProps['content'];
  imageName: string;
  imageAltText: string;
}

const ADD_FIELDS_STEP = {
  anchor: DISCOVER_TOUR_STEP_ANCHORS.addFields,
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
};

const ORDER_TABLE_COLUMNS_STEP = {
  anchor: DISCOVER_TOUR_STEP_ANCHORS.reorderColumns,
  title: i18n.translate('discover.dscTour.stepReorderColumns.title', {
    defaultMessage: 'Order the table columns',
  }),
  content: (
    <FormattedMessage
      id="discover.dscTour.stepReorderColumns.description"
      defaultMessage="Drag columns to the order you want."
    />
  ),
  imageName: 'reorder_columns.gif',
  imageAltText: i18n.translate('discover.dscTour.stepReorderColumns.imageAltText', {
    defaultMessage: 'Use the Columns popover to drag the columns to the order you prefer.',
  }),
};

const CHANGE_ROW_HEIGHT_STEP = {
  anchor: DISCOVER_TOUR_STEP_ANCHORS.changeRowHeight,
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
    defaultMessage: 'Click the display options icon to adjust the row height to fit the contents.',
  }),
};

const tourStepDefinitions: TourStepDefinition[] = [
  ADD_FIELDS_STEP,
  ORDER_TABLE_COLUMNS_STEP,
  {
    anchor: DISCOVER_TOUR_STEP_ANCHORS.sort,
    title: i18n.translate('discover.dscTour.stepSort.title', {
      defaultMessage: 'Sort on one or more fields',
    }),
    content: (
      <FormattedMessage
        id="discover.dscTour.stepSort.description"
        defaultMessage="Use the column heading to sort on a single field, or the popover for multiple fields."
      />
    ),
    imageName: 'sort.gif',
    imageAltText: i18n.translate('discover.dscTour.stepSort.imageAltText', {
      defaultMessage:
        'Click a column header and select the desired sort order. Adjust a multi-field sort using the fields sorted popover.',
    }),
  },
  CHANGE_ROW_HEIGHT_STEP,
  {
    anchor: DISCOVER_TOUR_STEP_ANCHORS.expandDocument,
    title: i18n.translate('discover.dscTour.stepExpand.title', {
      defaultMessage: 'Expand documents',
    }),
    content: (
      <FormattedMessage
        id="discover.dscTour.stepExpand.description"
        defaultMessage="Click {expandIcon} to view, compare, and filter documents."
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
    title: stepDefinition.title,
    maxWidth: MAX_WIDTH,
    content: (
      <>
        <EuiText>
          <p>{stepDefinition.content}</p>
        </EuiText>
        {stepDefinition.imageName && (
          <>
            <EuiSpacer size="m" />
            <EuiImage
              alt={stepDefinition.imageAltText}
              src={getAssetPath(stepDefinition.imageName)}
              size="fullWidth"
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

export const DiscoverTourProvider = ({ children }: { children: ReactElement }) => {
  const services = useDiscoverServices();
  const isEsqlMode = useIsEsqlMode();
  const prependToBasePath = services.core.http.basePath.prepend;
  const getAssetPath = useCallback(
    (imageName: string) => {
      return prependToBasePath(`/plugins/${PLUGIN_ID}/assets/discover_tour/${imageName}`);
    },
    [prependToBasePath]
  );
  const tourSteps = useMemo(
    () =>
      isEsqlMode
        ? prepareTourSteps(
            [ADD_FIELDS_STEP, ORDER_TABLE_COLUMNS_STEP, CHANGE_ROW_HEIGHT_STEP],
            getAssetPath
          )
        : prepareTourSteps(tourStepDefinitions, getAssetPath),
    [getAssetPath, isEsqlMode]
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
            {EuiI18n({ token: 'core.euiTourFooter.skipTour', default: 'Skip tour' })}
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
            {EuiI18n({ token: 'core.euiTourFooter.endTour', default: 'End tour' })}
          </EuiButton>
        ) : (
          <EuiButton
            {...actionButtonProps}
            onClick={onNextTourStep}
            data-test-subj="discoverTourButtonNext"
          >
            {EuiI18n({ token: 'core.euiTourFooter.nextStep', default: 'Next' })}
          </EuiButton>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
