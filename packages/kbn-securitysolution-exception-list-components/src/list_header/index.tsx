/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { FC } from 'react';
import { EuiIcon, EuiPageHeader, EuiText } from '@elastic/eui';
import * as i18n from '../translations';
import { textCss, descriptionContainerCss, headerCss } from './list_header.styles';
import { MenuItems } from './menu_items';
import { TextWithEdit } from '../text_with_edit';
import { EditModal } from './edit_modal';
import { ListDetails, Rule } from '../types';
import { useExceptionListHeader } from './use_list_header';
import { textWithEditContainerCss } from '../text_with_edit/text_with_edit.styles';

interface ExceptionListHeaderComponentProps {
  name: string;
  description?: string;
  listId: string;
  isReadonly: boolean;
  linkedRules: Rule[];
  dataTestSubj?: string;
  breadcrumbLink?: string;
  canUserEditList?: boolean;
  securityLinkAnchorComponent: React.ElementType; // This property needs to be removed to avoid the Prop Drilling, once we move all the common components from x-pack/security-solution/common
  onEditListDetails: (listDetails: ListDetails) => void;
  onExportList: () => void;
  onDeleteList: () => void;
  onManageRules: () => void;
}

const ExceptionListHeaderComponent: FC<ExceptionListHeaderComponentProps> = ({
  name,
  description,
  listId,
  linkedRules,
  isReadonly,
  dataTestSubj,
  securityLinkAnchorComponent,
  breadcrumbLink,
  canUserEditList = true,
  onEditListDetails,
  onExportList,
  onDeleteList,
  onManageRules,
}) => {
  const { isModalVisible, listDetails, onEdit, onSave, onCancel } = useExceptionListHeader({
    name,
    description,
    onEditListDetails,
  });
  return (
    <div css={headerCss}>
      <EuiPageHeader
        bottomBorder
        paddingSize="none"
        pageTitle={
          <TextWithEdit
            dataTestSubj={`${dataTestSubj || ''}Title`}
            text={listDetails.name || i18n.EXCEPTION_LIST_HEADER_NAME}
            isReadonly={isReadonly || !canUserEditList}
            onEdit={onEdit}
          />
        }
        responsive
        data-test-subj={`${dataTestSubj || ''}PageHeader`}
        description={
          <div css={descriptionContainerCss}>
            <TextWithEdit
              dataTestSubj={`${dataTestSubj || ''}Description`}
              textCss={textCss}
              isReadonly={isReadonly || !canUserEditList}
              text={listDetails.description || i18n.EXCEPTION_LIST_HEADER_DESCRIPTION}
              onEdit={onEdit}
            />
            <div css={textWithEditContainerCss} data-test-subj={`${dataTestSubj || ''}ListID`}>
              <EuiText css={textCss}>{i18n.EXCEPTION_LIST_HEADER_LIST_ID}:</EuiText>
              <EuiText css={textCss}>{listId}</EuiText>
            </div>
          </div>
        }
        rightSideItems={[
          <MenuItems
            dataTestSubj={`${dataTestSubj || ''}RightSideMenuItems`}
            linkedRules={linkedRules}
            isReadonly={isReadonly}
            canUserEditList={canUserEditList}
            securityLinkAnchorComponent={securityLinkAnchorComponent}
            onExportList={onExportList}
            onDeleteList={onDeleteList}
            onManageRules={onManageRules}
          />,
        ]}
        breadcrumbs={[
          {
            text: (
              <div data-test-subj={`${dataTestSubj || ''}Breadcrumb`}>
                <EuiIcon size="s" type="arrowLeft" />
                {i18n.EXCEPTION_LIST_HEADER_BREADCRUMB}
              </div>
            ),
            color: 'primary',
            'aria-current': false,
            href: breadcrumbLink,
            onClick: (e) => e.preventDefault(),
          },
        ]}
      />
      {isModalVisible && (
        <EditModal listDetails={listDetails} onSave={onSave} onCancel={onCancel} />
      )}
    </div>
  );
};

ExceptionListHeaderComponent.displayName = 'ExceptionListHeaderComponent';

export const ExceptionListHeader = React.memo(ExceptionListHeaderComponent);

ExceptionListHeader.displayName = 'ExceptionListHeader';
