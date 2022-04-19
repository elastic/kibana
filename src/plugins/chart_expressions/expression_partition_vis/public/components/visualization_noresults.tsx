/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EmptyPlaceholder } from '@kbn/charts-plugin/public';
import { ChartTypes } from '../../common/types';
import { getIcon } from '../utils';

interface Props {
  hasNegativeValues?: boolean;
  chartType: ChartTypes;
}

export const VisualizationNoResults: FC<Props> = ({ hasNegativeValues = false, chartType }) => {
  if (hasNegativeValues) {
    const message = (
      <FormattedMessage
        id="expressionPartitionVis.negativeValuesFound"
        defaultMessage="{chartType} chart can't render with negative values."
        values={{ chartType: `${chartType[0].toUpperCase()}${chartType.slice(1)}` }}
      />
    );

    return (
      <EmptyPlaceholder
        dataTestSubj="partitionVisNegativeValues"
        icon="alert"
        iconColor="warning"
        message={message}
      />
    );
  }

  return <EmptyPlaceholder dataTestSubj="partitionVisEmptyValues" icon={getIcon(chartType)} />;
};
