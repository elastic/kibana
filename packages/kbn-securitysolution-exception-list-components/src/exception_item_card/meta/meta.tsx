/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { memo } from 'react';
// import React, { memo, useMemo, useState } from 'react';
// import type { EuiContextMenuPanelProps } from '@elastic/eui';
import {
  EuiBadge,
  // EuiContextMenuItem,
  // EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  // EuiToolTip,
  EuiText,
  // EuiButtonEmpty,
  // EuiPopover,
} from '@elastic/eui';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
// import styled from 'styled-components';

import * as i18n from '../translations';
import { RuleReferences } from '../../types';
// import { FormattedDate } from '../../../../../../x-pack/plugins/security_solution/public/common/components/formatted_date';
// import { SecurityPageName } from '../../../../../../x-pack/plugins/security_solution/common/constants';
// import type { RuleReferenceSchema } from '../../../../../../x-pack/plugins/security_solution/common/detection_engine/schemas/response';
// import { SecuritySolutionLinkAnchor } from '../../../../../../x-pack/plugins/security_solution/public/common/components/links';
// import { RuleDetailTabs } from '../../../../../../x-pack/plugins/security_solution/public/detections/pages/detection_engine/rules/details';
// import { getRuleDetailsTabUrl } from '../../../../../../x-pack/plugins/security_solution/public/common/components/link_to/redirect_to_detection_engine';

// const StyledFlexItem = styled(EuiFlexItem)`
//   border-right: 1px solid #d3dae6;
//   padding: 4px 12px 4px 0;
// `;

export interface ExceptionItemCardMetaInfoProps {
  item: ExceptionListItemSchema;
  references: RuleReferences[];
  dataTestSubj: string;
}

export const ExceptionItemCardMetaInfo = memo<ExceptionItemCardMetaInfoProps>(
  ({ item, references, dataTestSubj }) => {
    // const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    // const onAffectedRulesClick = () => setIsPopoverOpen((isOpen) => !isOpen);
    // const onClosePopover = () => setIsPopoverOpen(false);

    // const itemActions = useMemo((): EuiContextMenuPanelProps['items'] => {
    //   if (references == null) {
    //     return [];
    //   }
    //   return references.map((reference) => (
    //     <EuiContextMenuItem
    //       data-test-subj={`${dataTestSubj}-actionItem-${reference.id}`}
    //       key={reference.id}
    //     >
    //       <EuiToolTip content={reference.name} anchorClassName="eui-textTruncate">
    //         {/* <SecuritySolutionLinkAnchor
    //           data-test-subj="ruleName"
    //           deepLinkId={SecurityPageName.rules}
    //           path={getRuleDetailsTabUrl(reference.id, RuleDetailTabs.alerts)}
    //         >
    //           {reference.name}
    //         </SecuritySolutionLinkAnchor> */}
    //       </EuiToolTip>
    //     </EuiContextMenuItem>
    //   ));
    // }, [references, dataTestSubj]);

    return (
      <div>change me</div>
      // <EuiFlexGroup
      //   alignItems="center"
      //   responsive={false}
      //   gutterSize="s"
      //   data-test-subj={dataTestSubj}
      // >
      //   {/* <StyledFlexItem grow={false}>
      //     <MetaInfoDetails
      //       fieldName="created_by"
      //       label={i18n.EXCEPTION_ITEM_CARD_CREATED_LABEL}
      //       value1={<FormattedDate fieldName="created_at" value={item.created_at} />}
      //       value2={item.created_by}
      //       dataTestSubj={`${dataTestSubj}-createdBy`}
      //     />
      //   </StyledFlexItem>
      //   <StyledFlexItem grow={false}>
      //     <MetaInfoDetails
      //       fieldName="updated_by"
      //       label={i18n.EXCEPTION_ITEM_CARD_UPDATED_LABEL}
      //       value1={<FormattedDate fieldName="updated_at" value={item.updated_at} />}
      //       value2={item.updated_by}
      //       dataTestSubj={`${dataTestSubj}-updatedBy`}
      //     />
      //   </StyledFlexItem> */}
      //   <EuiFlexItem grow={false}>
      //     <EuiPopover
      //       button={
      //         <EuiButtonEmpty
      //           onClick={onAffectedRulesClick}
      //           iconType="list"
      //           data-test-subj={`${dataTestSubj}-affectedRulesButton`}
      //         >
      //           {i18n.AFFECTED_RULES(references.length)}
      //         </EuiButtonEmpty>
      //       }
      //       panelPaddingSize="none"
      //       isOpen={isPopoverOpen}
      //       closePopover={onClosePopover}
      //       data-test-subj={`${dataTestSubj}-items`}
      //     >
      //       <EuiContextMenuPanel size="s" items={itemActions} />
      //     </EuiPopover>
      //   </EuiFlexItem>
      // </EuiFlexGroup>
    );
  }
);
ExceptionItemCardMetaInfo.displayName = 'ExceptionItemCardMetaInfo';

interface MetaInfoDetailsProps {
  fieldName: string;
  label: string;
  value1: JSX.Element | string;
  value2: string;
  dataTestSubj: string;
}

const MetaInfoDetails = memo<MetaInfoDetailsProps>(({ label, value1, value2, dataTestSubj }) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" wrap={false} responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" style={{ fontFamily: 'Inter' }}>
          {label}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false} data-test-subj={`${dataTestSubj}-value1`}>
        <EuiBadge color="default" style={{ fontFamily: 'Inter' }}>
          {value1}
        </EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" style={{ fontFamily: 'Inter' }}>
          {i18n.EXCEPTION_ITEM_CARD_META_BY}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false} data-test-subj={`${dataTestSubj}-value2`}>
        <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center" wrap={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" style={{ fontFamily: 'Inter' }}>
              {value2}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

MetaInfoDetails.displayName = 'MetaInfoDetails';
