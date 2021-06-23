/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';

import { AnnotationDomainType, LineAnnotation } from '@elastic/charts';

import { ThresholdLineConfig } from '../types';

type XYThresholdLineProps = ThresholdLineConfig & {
  groupId?: string;
};

export const XYThresholdLine: FC<XYThresholdLineProps> = ({
  show,
  value: dataValue,
  color,
  width,
  groupId,
  dash,
}) => {
  if (!show) {
    return null;
  }

  return (
    <LineAnnotation
      id="__threshold_line__"
      groupId={groupId}
      domainType={AnnotationDomainType.YDomain}
      dataValues={[{ dataValue }]}
      style={{
        line: {
          stroke: color,
          strokeWidth: width ?? 2,
          opacity: 1,
          dash,
        },
      }}
    />
  );
};
