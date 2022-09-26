/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { FC } from 'react';
// import styled from 'styled-components';
// import { FormattedMessage } from '@kbn/i18n-react';
import type { Pagination } from '@elastic/eui';
// import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

// import {
//   UtilityBar,
//   UtilityBarSection,
//   UtilityBarGroup,
//   UtilityBarText,
// } from '../../../../../x-pack/plugins/security_solution/public/common/components/utility_bar';
// import { FormattedRelativePreferenceDate } from '../../../../../x-pack/plugins/security_solution/public/common/components/formatted_date';

// const StyledText = styled.span`
//   font-weight: bold;
// `;

// const MyUtilities = styled(EuiFlexGroup)`
//   height: 50px;
// `;

// const StyledCondition = styled.span`
//   display: inline-block !important;
//   vertical-align: middle !important;
// `;
interface ExceptionsUtilityComponentProps {
  showingTextDataTestSubj?: string;
  lastUpdatedTextDataTestSubj?: string;
  exceptionsTitle?: string;
  exceptionsTitleDataTestSubj?: string;
  pagination: Pagination;
  // Corresponds to last time exception items were fetched
  lastUpdated: string | number | null;
}

const ExceptionsUtilityComponent: FC<ExceptionsUtilityComponentProps> = ({
  showingTextDataTestSubj,
  pagination,
  lastUpdated,

  lastUpdatedTextDataTestSubj,
  exceptionsTitle,
  exceptionsTitleDataTestSubj,
}) => {
  // const { pageSize, totalItemCount } = pagination;
  return (
    <div>change me </div>
    // <MyUtilities alignItems="center" justifyContent="spaceBetween">
    //   <EuiFlexItem grow={false}>
    //     <UtilityBar>
    //       <UtilityBarSection>
    //         <UtilityBarGroup>
    //           <UtilityBarText dataTestSubj={showingTextDataTestSubj}>
    //             <FormattedMessage
    //               id="xpack.securitySolution.exceptions.utility.paginationDetails"
    //               defaultMessage="Showing {partOne} of {partTwo}"
    //               values={{
    //                 partOne: <StyledText>{`1-${Math.min(pageSize, totalItemCount)}`}</StyledText>,
    //                 partTwo: <StyledText>{`${totalItemCount}`}</StyledText>,
    //               }}
    //             />
    //           </UtilityBarText>
    //           {exceptionsTitle && (
    //             <UtilityBarText dataTestSubj={exceptionsTitleDataTestSubj}>
    //               {exceptionsTitle}
    //             </UtilityBarText>
    //           )}
    //         </UtilityBarGroup>
    //       </UtilityBarSection>
    //     </UtilityBar>
    //   </EuiFlexItem>
    //   <EuiFlexItem grow={false}>
    //     <EuiText size="s" data-test-subj={lastUpdatedTextDataTestSubj}>
    //       <FormattedMessage
    //         id="xpack.securitySolution.exceptions.utility.lastUpdated"
    //         defaultMessage="Updated {updated}"
    //         values={{
    //           updated: (
    //             <StyledCondition>
    //               <FormattedRelativePreferenceDate
    //                 value={lastUpdated}
    //                 tooltipAnchorClassName="eui-textTruncate"
    //               />
    //             </StyledCondition>
    //           ),
    //         }}
    //       />
    //     </EuiText>
    //   </EuiFlexItem>
    // </MyUtilities>
  );
};

ExceptionsUtilityComponent.displayName = 'ExceptionsUtilityComponent';

export const ExceptionsUtility = React.memo(ExceptionsUtilityComponent);

ExceptionsUtility.displayName = 'ExceptionsUtility';
