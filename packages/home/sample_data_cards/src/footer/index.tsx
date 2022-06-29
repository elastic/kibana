/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { INSTALLED_STATUS } from '../constants';

import { SampleDataSet } from '../types';
import { InstallFooter } from './install_footer';
import { RemoveFooter } from './remove_footer';

export interface Props {
  sampleDataSet: SampleDataSet;
  onAction: (id: string) => void;
}

export const Footer = ({ sampleDataSet, onAction }: Props) => {
  if (sampleDataSet.status === INSTALLED_STATUS) {
    return <RemoveFooter onRemove={onAction} {...sampleDataSet} />;
  }

  return <InstallFooter onInstall={onAction} {...sampleDataSet} />;
};
