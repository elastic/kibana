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
import { textWithEditContainerCss, textCss } from './exception_list_header.styles';
import { MenuItems } from './menu_items';
import { TextWithEdit } from '../text_with_edit';

interface ExceptionListHeaderComponentProps {
  title: string;
  description?: string;
  listId?: string;
  isReadonly: boolean;
  dataTestSubj?: string;
  onEditTitle: () => void;
  onEditDescription: () => void;
  onExportList: () => void;
  onDeleteList: () => void;
}

const ExceptionListHeaderComponent: FC<ExceptionListHeaderComponentProps> = ({
  title,
  description,
  listId,
  isReadonly,
  dataTestSubj,
  onEditTitle,
  onEditDescription,
  onExportList,
  onDeleteList,
}) => {
  return (
    <>
      <EuiPageHeader
        bottomBorder
        paddingSize="none"
        pageTitle={
          <TextWithEdit
            text={title || i18n.EXCEPTION_LIST_HEADER_TITLE}
            isReadonly={isReadonly}
            onEdit={onEditTitle}
          />
        }
        responsive
        data-test-subj={`${dataTestSubj || ''}PageHeader`}
        description={
          <>
            <TextWithEdit
              textCss={textCss}
              isReadonly={isReadonly}
              text={description || i18n.EXCEPTION_LIST_HEADER_DESCRIPTION}
              onEdit={onEditDescription}
            />
            <div css={textWithEditContainerCss}>
              <EuiText css={textCss}>{i18n.EXCEPTION_LIST_HEADER_LIST_ID}:</EuiText>
              <EuiText css={textCss}>{listId}</EuiText>
            </div>
          </>
        }
        rightSideItems={[
          <MenuItems
            isReadonly={isReadonly}
            onExportList={onExportList}
            onDeleteList={onDeleteList}
          />,
        ]}
        breadcrumbs={[
          {
            text: (
              <>
                <EuiIcon size="s" type="arrowLeft" />
                {i18n.EXCEPTION_LIST_HEADER_BREADCRUMB}
              </>
            ),
            color: 'primary',
            'aria-current': false,
            href: '#',
            onClick: (e) => e.preventDefault(),
          },
        ]}
      />
    </>
  );
};

ExceptionListHeaderComponent.displayName = 'ExceptionListHeaderComponent';

export const ExceptionListHeader = React.memo(ExceptionListHeaderComponent);

ExceptionListHeader.displayName = 'ExceptionListHeader';
