/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactNode, ReactElement } from 'react';
import { EuiTourStep, PopoverAnchorPosition } from '@elastic/eui';

export interface ConsoleTourStepProps {
  step: number;
  stepsTotal: number;
  isStepOpen: boolean;
  title: ReactNode;
  content: ReactNode;
  onFinish: () => void;
  footerAction: ReactNode | ReactNode[];
  dataTestSubj: string;
  anchorPosition: string;
  maxWidth: number;
  css?: any;
}

interface Props {
  tourStepProps: ConsoleTourStepProps;
  children: ReactNode & ReactElement;
}

export const ConsoleTourStep = ({ tourStepProps, children }: Props) => {
  const {
    step,
    isStepOpen,
    stepsTotal,
    title,
    content,
    onFinish,
    footerAction,
    dataTestSubj,
    anchorPosition,
    maxWidth,
    css,
  } = tourStepProps;

  return (
    <EuiTourStep
      step={step}
      stepsTotal={stepsTotal}
      isStepOpen={isStepOpen}
      title={title}
      content={content}
      onFinish={onFinish}
      footerAction={footerAction}
      data-test-subj={dataTestSubj}
      anchorPosition={anchorPosition as PopoverAnchorPosition}
      maxWidth={maxWidth}
      css={css}
    >
      {children}
    </EuiTourStep>
  );
};
