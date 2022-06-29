/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiCard } from '@elastic/eui';

import { INSTALLED_STATUS } from './constants';

import type { SampleDataSet } from './types';
import { Footer } from './footer';

export interface Props {
  sampleDataSet: SampleDataSet;
  imagePath: string;
  onStatusChange: (id: string) => void;
}

export const SampleDataCard = ({
  sampleDataSet,
  imagePath: image,
  onStatusChange: onAction,
}: Props) => {
  const { name: title, description, id } = sampleDataSet;

  const betaBadgeProps = {
    label: sampleDataSet.status === INSTALLED_STATUS ? INSTALLED_STATUS : null,
  };

  const footer = <Footer {...{ sampleDataSet, onAction }} />;

  return (
    <EuiCard
      textAlign="left"
      data-test-subj={`sampleDataSetCard${id}`}
      {...{ image, title, description, betaBadgeProps, footer }}
    />
  );
};
