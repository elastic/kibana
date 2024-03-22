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
  EuiEmptyPrompt,
} from '@elastic/eui';
import { omit } from 'lodash';
import { PRODUCER_DISPLAY_NAMES } from '../../common/i18n';
import { RuleTypeWithDescription } from '../types';

interface RuleTypeListProps {
  ruleTypes: RuleTypeWithDescription[];
  onSelectRuleType: (ruleTypeId: string) => void;
  onFilterByProducer: (producer: string | null) => void;
  selectedProducer: string | null;
  ruleTypesCountsByProducer: { total: number; [x: string]: number };
}

const producerToDisplayName = (producer: string) => {
  return Reflect.get(PRODUCER_DISPLAY_NAMES, producer) ?? producer;
};

export const RuleTypeList: React.FC<RuleTypeListProps> = ({
  ruleTypes,
  onSelectRuleType,
  onFilterByProducer,
  selectedProducer,
  ruleTypesCountsByProducer,
}) => {
  const rulesList = [...ruleTypes].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <EuiFlexGroup
      style={{
        height: '100%',
      }}
    >
      <EuiFlexItem
        grow={1}
        style={{ paddingTop: 16 /* Match drop shadow padding in the right column */ }}
      >
        <EuiFacetGroup>
          <EuiFacetButton
            fullWidth
            quantity={ruleTypesCountsByProducer.total}
            onClick={() => onFilterByProducer(null)}
            isSelected={!selectedProducer}
          >
            All
          </EuiFacetButton>
          {Object.entries(omit(ruleTypesCountsByProducer, 'total'))
            .sort(([, aCount], [, bCount]) => bCount - aCount)
            .map(([producer, count]) => (
              <EuiFacetButton
                key={producer}
                fullWidth
                quantity={count}
                onClick={() => onFilterByProducer(producer)}
                isSelected={selectedProducer === producer}
              >
                {producerToDisplayName(producer)}
              </EuiFacetButton>
            ))}
        </EuiFacetGroup>
      </EuiFlexItem>
      <EuiFlexItem
        grow={3}
        style={{
          overflowY: 'auto',
          padding: '16px 16px 32px', // Add padding to prevent drop shadow from hovered cards from being cut off
        }}
      >
        {rulesList.length === 0 && (
          <EuiEmptyPrompt
            iconType="search"
            title={<h2>No rule types found</h2>}
            body={<p>Try a different search or change your filter settings.</p>}
          />
        )}
        {rulesList.map((rule) => (
          <React.Fragment key={rule.id}>
            <EuiCard
              titleSize="xs"
              textAlign="left"
              hasBorder
              title={rule.name}
              onClick={() => onSelectRuleType(rule.id)}
              description={
                <>
                  {rule.description}
                  {rule.description && <EuiSpacer size="s" />}
                  <EuiText
                    color="subdued"
                    size="xs"
                    style={{ textTransform: 'uppercase', fontWeight: 'bold' }}
                  >
                    {producerToDisplayName(rule.producer)}
                  </EuiText>
                </>
              }
              style={{ marginRight: '8px', flexGrow: 0 }}
            />
            <EuiSpacer size="s" />
          </React.Fragment>
        ))}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
