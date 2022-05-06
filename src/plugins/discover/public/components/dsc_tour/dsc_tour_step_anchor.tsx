/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { htmlIdGenerator } from '@elastic/eui';
import { css } from '@emotion/react';

const anchorStyle = css`
  display: inline-block;
`;

export const DSC_TOUR_STEP_ANCHORS = {
  addFields: htmlIdGenerator('dsc-tour-step-add-fields')(),
  reorderColumns: htmlIdGenerator('dsc-tour-step-reorder-columns')(),
  sort: htmlIdGenerator('dsc-tour-step-sort')(),
  changeRowHeight: htmlIdGenerator('dsc-tour-step-row-height')(),
  expandDocument: htmlIdGenerator('dsc-tour-step-expand')(),
};

export const DscTourStepAnchor: React.FC<{ stepName: keyof typeof DSC_TOUR_STEP_ANCHORS }> = ({
  stepName,
  children,
}) => {
  return (
    <div css={!children && anchorStyle}>
      <div id={DSC_TOUR_STEP_ANCHORS[stepName]}>{children}</div>
    </div>
  );
};
