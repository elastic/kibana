/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useStreamsFlyoutRenderer } from '../../../hooks/use_streams_flyout_renderer';

interface StreamFieldSectionProps {
  sourceName: string;
}

export const StreamFieldSection = ({ sourceName }: StreamFieldSectionProps) => {
  const renderByStreamName = useStreamsFlyoutRenderer();

  if (!renderByStreamName || !sourceName) {
    return null;
  }

  return <>{renderByStreamName({ streamName: sourceName })}</>;
};
