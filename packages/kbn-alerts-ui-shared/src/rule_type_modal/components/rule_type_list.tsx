/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFacetGroup,
  EuiFacetButton,
  EuiCard,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { countBy } from 'lodash';
import { PRODUCER_DISPLAY_NAMES } from '../../common/i18n';
import { RuleTypeIndexWithDescriptions } from '../types';

interface RuleTypeListProps {
  ruleTypeIndex: RuleTypeIndexWithDescriptions;
  onClickRule: (ruleTypeId: string) => void;
  onClickFacet: (category: string) => void;
}

const producerToDisplayName = (producer: string) => {
  return Reflect.get(PRODUCER_DISPLAY_NAMES, producer) ?? producer;
};

export const RuleTypeList: React.FC<RuleTypeListProps> = ({
  ruleTypeIndex,
  onClickRule,
  onClickFacet,
}) => {
  const categoryCount = countBy(Array.from(ruleTypeIndex.values()), 'producer');

  const rulesList = Array.from(ruleTypeIndex.values()).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <EuiFlexGroup style={{ height: '100%' }}>
      <EuiFlexItem grow={1}>
        <EuiFacetGroup>
          <EuiFacetButton fullWidth quantity={ruleTypeIndex.size} isSelected>
            All
          </EuiFacetButton>
          {Object.entries(categoryCount)
            .sort(([, aCount], [, bCount]) => bCount - aCount)
            .map(([category, count]) => (
              <EuiFacetButton
                key={category}
                fullWidth
                quantity={count}
                onClick={() => onClickFacet(category)}
              >
                {producerToDisplayName(category)}
              </EuiFacetButton>
            ))}
        </EuiFacetGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={3} style={{ overflowY: 'auto' }}>
        {rulesList.map((rule) => (
          <React.Fragment key={rule.id}>
            <EuiCard
              titleSize="xs"
              textAlign="left"
              hasBorder
              title={rule.name}
              onClick={() => onClickRule(rule.id)}
              description={
                <>
                  {rule.description}
                  {rule.description && <EuiSpacer size="s" />}
                  <EuiText color="subdued">
                    <h6>{producerToDisplayName(rule.producer)}</h6>
                  </EuiText>
                </>
              }
              style={{ marginRight: '8px' }}
            />
            <EuiSpacer size="s" />
          </React.Fragment>
        ))}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
