/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiCard, EuiIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

export const CardRegular = () => (
  <EuiCard
    icon={<EuiIcon size="xxl" type="dashboardApp" aria-hidden={true} />}
    title="Dashboards"
    description="Example of a card's description. Stick to one or two sentences."
  />
);

export const CardClickable = () => (
  <EuiCard
    icon={<EuiIcon size="xxl" type="discoverApp" aria-hidden={true} />}
    title="Discover"
    description="Click this card to perform an action."
    onClick={() => {}}
  />
);

export const CardHorizontal = () => (
  <EuiCard
    icon={<EuiIcon size="xxl" type="logsApp" aria-hidden={true} />}
    title="Logs"
    description="A horizontally laid out card."
    layout="horizontal"
  />
);

export const CardPlain = () => (
  <EuiCard
    icon={<EuiIcon size="xxl" type="savedObjectsApp" aria-hidden={true} />}
    title="Plain card"
    description="A card without borders or shadow."
    display="plain"
  />
);

export const CardBordered = () => (
  <EuiCard
    icon={<EuiIcon size="xxl" type="monitoringApp" aria-hidden={true} />}
    title="Bordered"
    description="A card with a border instead of shadow."
    hasBorder
  />
);

export const CardGroup = () => (
  <EuiFlexGroup gutterSize="l">
    <EuiFlexItem>
      <EuiCard
        icon={<EuiIcon size="xxl" type="dashboardApp" aria-hidden={true} />}
        title="Dashboards"
        description="View your dashboards."
      />
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiCard
        icon={<EuiIcon size="xxl" type="discoverApp" aria-hidden={true} />}
        title="Discover"
        description="Explore your data."
      />
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiCard
        icon={<EuiIcon size="xxl" type="canvasApp" aria-hidden={true} />}
        title="Canvas"
        description="Create presentations."
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);
