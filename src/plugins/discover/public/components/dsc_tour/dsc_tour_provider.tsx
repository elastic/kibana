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
  EuiText,
} from '@elastic/eui';
import { PLUGIN_ID } from '../../../common';
import { useDiscoverServices } from '../../utils/use_discover_services';
import { DscTourContext, DscTourContextProps } from './dsc_tour_context';
import { DSC_TOUR_STEP_ANCHORS } from './dsc_tour_step_anchor';

interface TourStepDefinition {
  anchor: EuiTourStepProps['anchor'];
  anchorPosition: EuiTourStepProps['anchorPosition'];
  title: EuiTourStepProps['title'];
  text: string;
  imageName?: string;
  isOptional?: boolean;
}

const tourStepDefinitions: TourStepDefinition[] = [
  {
    anchor: `#${DSC_TOUR_STEP_ANCHORS.addFields}`,
    anchorPosition: 'upCenter',
    title: i18n.translate('discover.docExplorerTour.stepAddFieldsTitle', {
      defaultMessage: 'Add fields to the table',
    }),
    text: i18n.translate('discover.docExplorerTour.stepAddFieldsDescription', {
      defaultMessage: 'Click + <TODO> to add the fields that interest you.',
    }),
    imageName: 'add_fields.gif',
  },
  {
    anchor: `#${DSC_TOUR_STEP_ANCHORS.reorderColumns}`,
    anchorPosition: 'upCenter',
    title: i18n.translate('discover.docExplorerTour.stepReorderColumnsTitle', {
      defaultMessage: 'Reorder columns',
    }),
    text: i18n.translate('discover.docExplorerTour.stepReorderColumnsDescription', {
      defaultMessage: 'Order your columns however you want.',
    }),
    imageName: 'reorder_columns.gif',
    isOptional: true,
  },
  {
    anchor: `#${DSC_TOUR_STEP_ANCHORS.sort}`,
    anchorPosition: 'rightUp',
    title: i18n.translate('discover.docExplorerTour.stepSortFieldsTitle', {
      defaultMessage: 'Sort on one or more fields',
    }),
    text: i18n.translate('discover.docExplorerTour.stepSortFieldsDescription', {
      defaultMessage:
        'Sort a single field by clicking a column header. Sort by multiple fields using the pop-up.',
    }),
  },
  {
    anchor: `#${DSC_TOUR_STEP_ANCHORS.changeRowHeight}`,
    anchorPosition: 'leftUp',
    title: i18n.translate('discover.docExplorerTour.stepChangeRowHeightTitle', {
      defaultMessage: 'Change the row height',
    }),
    text: i18n.translate('discover.docExplorerTour.stepChangeRowHeightDescription', {
      defaultMessage: 'Adjust the number of lines to fit the contents.',
    }),
    imageName: 'rows_per_line.gif',
  },
  {
    anchor: `#${DSC_TOUR_STEP_ANCHORS.expandDocument}`,
    anchorPosition: 'rightUp',
    title: i18n.translate('discover.docExplorerTour.stepExpandTitle', {
      defaultMessage: 'Compare and expand',
    }),
    text: i18n.translate('discover.docExplorerTour.stepExpandDescription', {
      defaultMessage:
        'Narrow your view by selecting specific documents. View details by clicking <TODO>.',
    }),
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
      content: (
        <>
          <EuiText size="s">{stepDefinition.text}</EuiText>
          {stepDefinition.imageName && (
            <>
              <EuiSpacer size="s" />
              <EuiImage alt="TODO" src={getAssetPath(stepDefinition.imageName)} size={300} />
            </>
          )}
        </>
      ),
    })) as EuiTourStepProps[];

const tourConfig: EuiTourState = {
  currentTourStep: FIRST_STEP,
  isTourActive: false,
  tourPopoverWidth: 350,
  tourSubtitle: '',
};

export const DscTourProvider: React.FC = ({ children }) => {
  const services = useDiscoverServices();
  const prependToBasePath = services.core.http.basePath.prepend;
  const getAssetPath = useCallback(
    (imageName: string) => {
      return prependToBasePath(`/plugins/${PLUGIN_ID}/assets/dsc_tour/${imageName}`);
    },
    [prependToBasePath]
  );
  const [steps, actions] = useEuiTour(
    prepareTourSteps(tourStepDefinitions, getAssetPath, true),
    tourConfig
  );

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

  const contextValue: DscTourContextProps = useMemo(
    () => ({
      onStartTour,
      onNextTourStep,
      onFinishTour,
    }),
    [onStartTour, onNextTourStep, onFinishTour]
  );

  return (
    <DscTourContext.Provider value={contextValue}>
      {steps.map((step) => (
        <EuiTourStep
          key={`step-${step.step}-of-${steps.length}`}
          {...step}
          footerAction={
            <DscTourStepFooterAction
              isLastStep={step.step === steps[steps.length - 1].step}
              onNextTourStep={onNextTourStep}
              onFinishTour={onFinishTour}
            />
          }
        />
      ))}
      {children}
    </DscTourContext.Provider>
  );
};

export const DscTourStepFooterAction: React.FC<{
  isLastStep: boolean;
  onNextTourStep: DscTourContextProps['onNextTourStep'];
  onFinishTour: DscTourContextProps['onFinishTour'];
}> = ({ isLastStep, onNextTourStep, onFinishTour }) => {
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
