/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { SampleDataSet, InstalledStatus } from '@kbn/home-sample-data-types';
import { INSTALLED_STATUS, UNINSTALLED_STATUS } from '../constants';

import { DisabledFooter } from './disabled_footer';
import { InstallFooter } from './install_footer';
import { RemoveFooter } from './remove_footer';

/**
 * Props for the `Footer` component.
 */
export interface Props {
  /** The Sample Data Set and its status. */
  sampleDataSet: SampleDataSet;
  /** The handler to invoke when an action is performed upon the Sample Data Set. */
  onAction: (id: string, status: InstalledStatus) => void;
}

/**
 * Displays the appropriate Footer component based on the status of the Sample Data Set.
 */
export const Footer = ({ sampleDataSet, onAction }: Props) => {
  if (sampleDataSet.status === INSTALLED_STATUS) {
    return <RemoveFooter onRemove={(id) => onAction(id, UNINSTALLED_STATUS)} {...sampleDataSet} />;
  }

  if (sampleDataSet.status === UNINSTALLED_STATUS) {
    return <InstallFooter onInstall={(id) => onAction(id, INSTALLED_STATUS)} {...sampleDataSet} />;
  }

  return <DisabledFooter {...sampleDataSet} />;
};
