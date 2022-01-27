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
  EuiStatelessTourStep,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTourActions,
} from '@elastic/eui';

import expandDocumentGif from '../../assets/expand_document.gif';
import reorderColumnsGif from '../../assets/reorder_columns.gif';
import rowsPerLineGif from '../../assets/rows_per_line.gif';

export const demoTourSteps = [
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
    anchorPosition: 'upLeft',
  } as EuiStatelessTourStep,
  {
    step: 3,
    title: 'Adjust the row height',
    content: (
      <EuiText>
        <p>
          Click <EuiIcon type="tableDensityCompact" /> and then set the desired height.
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
  isTourActive: true,
  tourPopoverWidth: 350,
  tourSubtitle: '',
};

export const STORAGE_KEY = 'discover.demoTour';

export const buttomButtons = (tourActions: EuiTourActions) => {
  return (
    <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          color="text"
          size="xs"
          onClick={() => {
            tourActions.finishTour();
          }}
        >
          {'Skip tour'}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          color="success"
          onClick={() => {
            tourActions.incrementStep();
          }}
        >
          {'Next'}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
