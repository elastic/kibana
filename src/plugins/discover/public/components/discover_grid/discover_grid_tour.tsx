/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiIcon,
  EuiImage,
  EuiText,
  EuiTourState,
  EuiStatelessTourStep,
  EuiTourStepProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTourActions,
} from '@elastic/eui';

import expandDocumentGif from '../../assets/expand_document.gif';
import reorderColumnsGif from '../../assets/reorder_columns.gif';
import rowsPerLineGif from '../../assets/rows_per_line.gif';

export interface DiscoverTourDetails {
  steps: EuiTourStepProps[];
  actions: EuiTourActions;
  state: EuiTourState;
}

export const discoverTourSteps = [
  {
    step: 1,
    title: 'Expand a document',
    content: (
      <EuiText>
        <p>
          Click the <EuiIcon type="expand" /> button to see a document in detail.
        </p>
        <EuiImage alt="Some alt text" src={expandDocumentGif} />
      </EuiText>
    ),
    maxWidth: 350,
  } as EuiStatelessTourStep,
  {
    step: 2,
    title: 'Reorder your columns',
    content: (
      <EuiText>
        <p>
          Click <EuiIcon type="list" /> Columns and then drag to the desired order.
        </p>
        <EuiImage alt="Some alt text" src={reorderColumnsGif} />
      </EuiText>
    ),
    maxWidth: 350,
    anchorPosition: 'downLeft',
  } as EuiStatelessTourStep,
  {
    step: 3,
    title: 'Adjust the row height',
    content: (
      <EuiText>
        <p>
          Click <EuiIcon type="tableDensityCompact" /> to set the row height to 1 or more lines, or
          automatically adjust the height to fit the contents.
        </p>
        <EuiImage alt="Some alt text" src={rowsPerLineGif} />
      </EuiText>
    ),
    maxWidth: 350,
    anchorPosition: 'leftCenter',
  } as EuiStatelessTourStep,
] as EuiStatelessTourStep[];

export const tourConfig = {
  currentTourStep: 1,
  isTourActive: false,
  tourPopoverWidth: 350,
  tourSubtitle: '',
};

export const STORAGE_KEY = 'discover.demoTour';

export const buttomButtons = (tour: DiscoverTourDetails) => {
  let emptyButton;
  let mainButton;
  if (tour.state.currentTourStep === discoverTourSteps.length) {
    emptyButton = {
      properties: {
        target: '_blank',
        href: 'https://github.com/elastic/kibana/issues/new/choose',
      },
      text: (
        <>
          {'Give feedback'} <EuiIcon type="popout" size="s" />
        </>
      ),
    };
    mainButton = {
      properties: {
        onClick: () => {
          tour.actions.finishTour();
        },
      },
      text: 'Finish tour',
    };
  } else {
    emptyButton = {
      properties: {
        onClick: () => {
          tour.actions.finishTour();
        },
      },
      text: 'Skip tour',
    };
    mainButton = {
      properties: {
        onClick: () => {
          tour.actions.incrementStep();
        },
      },
      text: 'Next',
    };
  }

  return (
    <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty color="text" size="xs" {...emptyButton.properties}>
          {emptyButton.text}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton size="s" color="success" {...mainButton.properties}>
          {mainButton.text}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
