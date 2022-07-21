/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiText } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import { ConditionTypes } from './filters_editor_condition_types';

export interface FilterGroupProps {
  filters: Filter[];
  conditionType: ConditionTypes;
}

export function FilterGroup({ filters, conditionType }: FilterGroupProps) {
  return (
    <>
      <EuiFlexGroup gutterSize="none" responsive={false}>
        <EuiFlexItem>
          <EuiHorizontalRule margin="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" className="kbnQueryBar__filterModalORText" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiHorizontalRule margin="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
