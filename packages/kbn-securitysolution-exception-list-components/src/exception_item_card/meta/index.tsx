/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo, useMemo } from 'react';
import type { EuiContextMenuPanelProps } from '@elastic/eui';
import { EuiContextMenuItem, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import * as i18n from '../translations';
import type { RuleReference } from '../../types';
import { MetaInfoDetails } from './details_info/details_info';
import { HeaderMenu } from '../../header_menu';

const itemCss = css`
  border-right: 1px solid #d3dae6;
  padding: ${euiThemeVars.euiSizeS} ${euiThemeVars.euiSizeM} ${euiThemeVars.euiSizeS} 0;
`;

export interface ExceptionItemCardMetaInfoProps {
  item: ExceptionListItemSchema;
  references: RuleReference[];
  dataTestSubj: string;
  formattedDateComponent: React.ElementType; // This property needs to be removed to avoid the Prop Drilling, once we move all the common components from x-pack/security-solution/common
  securityLinkAnchorComponent: React.ElementType; // This property needs to be removed to avoid the Prop Drilling, once we move all the common components from x-pack/security-solution/common
}

export const ExceptionItemCardMetaInfo = memo<ExceptionItemCardMetaInfoProps>(
  ({ item, references, dataTestSubj, securityLinkAnchorComponent, formattedDateComponent }) => {
    const FormattedDateComponent = formattedDateComponent;
    const itemActions = useMemo((): EuiContextMenuPanelProps['items'] => {
      if (references == null || securityLinkAnchorComponent === null) {
        return [];
      }

      const SecurityLinkAnchor = securityLinkAnchorComponent;
      return references.map((reference) => (
        <EuiContextMenuItem
          data-test-subj={`${dataTestSubj || ''}ActionItem${reference.id}`}
          key={reference.id}
        >
          <EuiToolTip content={reference.name} anchorClassName="eui-textTruncate">
            <SecurityLinkAnchor referenceName={reference.name} referenceId={reference.id} />
          </EuiToolTip>
        </EuiContextMenuItem>
      ));
    }, [references, securityLinkAnchorComponent, dataTestSubj]);

    return (
      <EuiFlexGroup alignItems="center" responsive gutterSize="s" data-test-subj={dataTestSubj}>
        {FormattedDateComponent !== null && (
          <>
            <EuiFlexItem css={itemCss} grow={false}>
              <MetaInfoDetails
                fieldName="created_by"
                label={i18n.EXCEPTION_ITEM_CARD_CREATED_LABEL}
                lastUpdate={
                  <FormattedDateComponent fieldName="created_at" value={item.created_at} />
                }
                lastUpdateValue={item.created_by}
                dataTestSubj={`${dataTestSubj || ''}CreatedBy`}
              />
            </EuiFlexItem>

            <EuiFlexItem css={itemCss} grow={false}>
              <MetaInfoDetails
                fieldName="updated_by"
                label={i18n.EXCEPTION_ITEM_CARD_UPDATED_LABEL}
                lastUpdate={
                  <FormattedDateComponent fieldName="updated_at" value={item.updated_at} />
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
            actions={itemActions}
            disableActions={false}
            text={i18n.AFFECTED_RULES(references.length)}
            dataTestSubj={dataTestSubj}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
ExceptionItemCardMetaInfo.displayName = 'ExceptionItemCardMetaInfo';
