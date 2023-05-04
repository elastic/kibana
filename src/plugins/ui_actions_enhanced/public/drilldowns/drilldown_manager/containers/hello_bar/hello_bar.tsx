/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { useDrilldownManager } from '../context';
import { DrilldownHelloBar } from '../../components/drilldown_hello_bar';

export const HelloBar: React.FC = ({}) => {
  const drilldowns = useDrilldownManager();
  const hideWelcomeMessage = drilldowns.useWelcomeMessage();

  if (hideWelcomeMessage) return null;

  return (
    <DrilldownHelloBar
      docsLink={drilldowns.deps.docsLink}
      onHideClick={drilldowns.hideWelcomeMessage}
    />
  );
};
