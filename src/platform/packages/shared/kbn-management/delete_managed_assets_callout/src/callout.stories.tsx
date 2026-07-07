/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { DeleteManagedAssetsCallout as Component } from './callout';

export default {
  title: 'Developer/Delete Managed Assets Callout',
  description: '',
};

export const DeleteManagedAssetsCallout = () => {
  return <Component assetName="ingest pipelines" />;
};

export const ErrorDeleteManagedAssetsCallout = () => {
  return <Component assetName="ingest pipelines" color="danger" iconType="trash" />;
};
