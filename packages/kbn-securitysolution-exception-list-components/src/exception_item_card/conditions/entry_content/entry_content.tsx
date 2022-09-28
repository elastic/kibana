/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo } from 'react';
import { EuiExpression, EuiToken, EuiFlexGroup } from '@elastic/eui';
import { ListOperatorTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import {
  nestedGroupSpaceCss,
  valueContainerCss,
  expressionContainerCss,
} from '../conditions.styles';
import type { Entry } from '../types';
import * as i18n from '../../translations';
import { getValue, getValueExpression } from './entry_content.helper';

export const EntryContent = memo(
  ({
    entry,
    index,
    isNestedEntry = false,
    dataTestSubj,
  }: {
    entry: Entry;
    index: number;
    isNestedEntry?: boolean;
    dataTestSubj?: string;
  }) => {
    const { field, type } = entry;
    const value = getValue(entry);
    const operator = 'operator' in entry ? entry.operator : '';

    const entryKey = `${field}${type}${value}${index}`;
    return (
      <div data-test-subj={`${dataTestSubj || ''}${entryKey}EntryContent`} key={entryKey}>
        <div css={expressionContainerCss}>
          {isNestedEntry ? (
            <EuiFlexGroup
              css={nestedGroupSpaceCss}
              direction="row"
              alignItems="center"
              gutterSize="m"
            >
              <EuiToken iconType="tokenNested" size="s" />

              <div css={valueContainerCss}>
                <EuiExpression description="" value={field} color="subdued" />
                {getValueExpression(type as ListOperatorTypeEnum, operator, value)}
              </div>
            </EuiFlexGroup>
          ) : (
            <>
              <EuiExpression
                description={index === 0 ? '' : i18n.CONDITION_AND}
                value={field}
                color={index === 0 ? 'primary' : 'subdued'}
              />

              {getValueExpression(type as ListOperatorTypeEnum, operator, value)}
            </>
          )}
        </div>
      </div>
    );
  }
);
EntryContent.displayName = 'EntryContent';
