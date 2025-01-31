/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { isArray } from 'lodash/fp';
import type { GroupPanelRenderer } from '@kbn/grouping/src';
import { firstNonNullValue } from '@kbn/grouping/src';
import type { DataByGroupingAgg } from '../types';
import { InstanceIdGroupContent, RuleNameGroupContent } from './group_panels';

/**
 * Render function for the group panel header
 */
export const renderGroupPanel: GroupPanelRenderer<DataByGroupingAgg> = (selectedGroup, bucket) => {
  switch (selectedGroup) {
    case 'kibana.alert.rule.name':
      return isArray(bucket.key) ? <RuleNameGroupContent ruleName={bucket.key[0]} /> : undefined;
    case 'kibana.alert.instance.id':
      return <InstanceIdGroupContent instanceId={firstNonNullValue(bucket.key)} />;
  }
};
