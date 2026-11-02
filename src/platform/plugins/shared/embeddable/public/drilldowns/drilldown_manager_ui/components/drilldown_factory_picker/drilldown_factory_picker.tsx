/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { DrilldownFactory } from '../../types';
import { DrilldownFactoryItem } from './drilldown_factory_item';

interface Props {
  factories: DrilldownFactory[];
  onSelect: (factory: DrilldownFactory) => void;
}

// The below style is applied to fix Firefox rendering bug.
// See: https://github.com/elastic/kibana/pull/61219/#pullrequestreview-402903330
const firefoxBugFix = {
  willChange: 'opacity',
};

const sort = (f1: DrilldownFactory, f2: DrilldownFactory): number => f2.order - f1.order;

export const DrilldownFactoryPicker: React.FC<Props> = ({ factories, onSelect }) => {
  /**
   * Make sure items with incompatible license are at the end.
   */
  const factoriesSorted = React.useMemo(() => {
    const compatible = factories.filter((f) => f.isLicenseCompatible ?? true);
    const incompatible = factories.filter((f) => !(f.isLicenseCompatible ?? true));
    return [...compatible.sort(sort), ...incompatible.sort(sort)];
  }, [factories]);

  const handleSelect = React.useCallback(
    (id: string) => {
      if (!onSelect) return;
      const actionFactory = factories.find((af) => af.type === id);
      if (!actionFactory) return;
      onSelect(actionFactory);
    },
    [onSelect, factories]
  );

  if (factoriesSorted.length === 0) {
    // This is not user facing, as it would be impossible to get into this state
    // just leaving for dev purposes for troubleshooting.
    return <div>No drilldown factories to pick from.</div>;
  }

  return (
    <EuiFlexGroup gutterSize="m" responsive={false} wrap={true} style={firefoxBugFix}>
      {factoriesSorted.map((factory) => (
        <EuiFlexItem grow={false} key={factory.type}>
          <DrilldownFactoryItem factory={factory} onSelect={handleSelect} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
