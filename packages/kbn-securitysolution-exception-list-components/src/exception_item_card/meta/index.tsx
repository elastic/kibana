/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import * as i18n from '../translations';
import type { Rule } from '../../types';
import { MetaInfoDetails } from './details_info';
import { HeaderMenu } from '../../header_menu';
import { generateLinkedRulesMenuItems } from '../../generate_linked_rules_menu_item';

const itemCss = css`
  border-right: 1px solid #d3dae6;
  padding: ${euiThemeVars.euiSizeS} ${euiThemeVars.euiSizeM} ${euiThemeVars.euiSizeS} 0;
`;

export interface ExceptionItemCardMetaInfoProps {
  item: ExceptionListItemSchema;
  rules: Rule[];
  dataTestSubj: string;
  formattedDateComponent: React.ElementType; // This property needs to be removed to avoid the Prop Drilling, once we move all the common components from x-pack/security-solution/common
  securityLinkAnchorComponent: React.ElementType; // This property needs to be removed to avoid the Prop Drilling, once we move all the common components from x-pack/security-solution/common
}

export const ExceptionItemCardMetaInfo = memo<ExceptionItemCardMetaInfoProps>(
  ({ item, rules, dataTestSubj, securityLinkAnchorComponent, formattedDateComponent }) => {
    const FormattedDateComponent = formattedDateComponent;

    const referencedLinks = useMemo(
      () =>
        generateLinkedRulesMenuItems({
          dataTestSubj,
          linkedRules: rules,
          securityLinkAnchorComponent,
        }),
      [dataTestSubj, rules, securityLinkAnchorComponent]
    );
    return (
      <EuiFlexGroup alignItems="center" responsive gutterSize="s" data-test-subj={dataTestSubj}>
        {FormattedDateComponent !== null && (
          <>
            <EuiFlexItem css={itemCss} grow={false}>
              <MetaInfoDetails
                label={i18n.EXCEPTION_ITEM_CARD_CREATED_LABEL}
                lastUpdate={
                  <FormattedDateComponent
                    data-test-subj={`{dataTestSubj||''}formattedDateComponentCreatedBy`}
                    fieldName="created_at"
                    value={item.created_at}
                  />
                }
                lastUpdateValue={item.created_by}
                dataTestSubj={`${dataTestSubj || ''}CreatedBy`}
              />
            </EuiFlexItem>

            <EuiFlexItem css={itemCss} grow={false}>
              <MetaInfoDetails
                label={i18n.EXCEPTION_ITEM_CARD_UPDATED_LABEL}
                lastUpdate={
                  <FormattedDateComponent
                    data-test-subj={`{dataTestSubj||''}formattedDateComponentUpdatedBy`}
                    fieldName="updated_at"
                    value={item.updated_at}
                  />
                }
                lastUpdateValue={item.updated_by}
                dataTestSubj={`${dataTestSubj || ''}UpdatedBy`}
              />
            </EuiFlexItem>
          </>
        )}
        <EuiFlexItem>
          <HeaderMenu
            emptyButton
            useCustomActions
            iconType="list"
            actions={referencedLinks}
            disableActions={false}
            text={i18n.AFFECTED_RULES(rules.length)}
            dataTestSubj={dataTestSubj}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
ExceptionItemCardMetaInfo.displayName = 'ExceptionItemCardMetaInfo';
