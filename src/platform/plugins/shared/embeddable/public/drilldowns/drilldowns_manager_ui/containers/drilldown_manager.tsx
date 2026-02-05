/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { FlyoutFrame } from '../components/flyout_frame';
import { DrilldownHelloBar } from '../components/drilldown_hello_bar/drilldown_hello_bar';

interface Props {
  onClose: () => void
}

export const DrilldownManager = (props: Props) => {
  return (
    <FlyoutFrame
      title={<div>RenderDrilldownManagerTitle</div>}
      banner={<DrilldownHelloBar />}
      footer={<div>RenderDrilldownManagerFooter</div>}
      onClose={props.onClose}
      onBack={() => {}}
    >
      <div>DrilldownManagerContent</div>
    </FlyoutFrame>
  );
};
