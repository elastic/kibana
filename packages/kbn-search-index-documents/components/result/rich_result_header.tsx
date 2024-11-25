/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';

import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiText,
  EuiTextColor,
  EuiTitle,
  useEuiTheme,
  EuiToolTip,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { MetaDataProps } from './result_types';

interface Props {
  metaData: MetaDataProps;
  title: string;
  rightSideActions?: React.ReactNode;
  showScore?: boolean;
  onTitleClick?: () => void;
}

interface TermDef {
  label: string | number;
}

const Term: React.FC<TermDef> = ({ label }) => (
  <EuiFlexItem grow={false}>
    <strong>
      <EuiTextColor color="subdued">{label}:</EuiTextColor>
    </strong>
  </EuiFlexItem>
);

const Definition: React.FC<TermDef> = ({ label }) => (
  <EuiFlexItem>
    <EuiTextColor color="subdued">{label}</EuiTextColor>
  </EuiFlexItem>
);
const MetadataPopover: React.FC<MetaDataProps> = ({
  id,
  onDocumentDelete,
  score,
  showScore = false,
  hasDeleteDocumentsPrivilege,
}) => {
  const [popoverIsOpen, setPopoverIsOpen] = useState(false);
  const closePopover = () => setPopoverIsOpen(false);

  const metaDataIcon = (
    <EuiButtonIcon
      display="empty"
      size="s"
      iconType="iInCircle"
      color="primary"
      data-test-subj="documentMetadataButton"
      onClick={(e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        setPopoverIsOpen(!popoverIsOpen);
      }}
      aria-label={i18n.translate('searchIndexDocuments.result.header.metadata.icon.ariaLabel', {
        defaultMessage: 'Metadata for document: {id}',
        values: { id },
      })}
    />
  );

  return (
    <EuiPopover button={metaDataIcon} isOpen={popoverIsOpen} closePopover={closePopover}>
      <EuiPopoverTitle>
        <FormattedMessage
          id="searchIndexDocuments.result.compactCard.header.metadata.title"
          defaultMessage="Document metadata"
        />
      </EuiPopoverTitle>
      <EuiFlexGroup
        gutterSize="s"
        direction="column"
        css={css`
          width: 20rem;
        `}
      >
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s">
            <Term label="ID" />
            <Definition label={id} />
          </EuiFlexGroup>
        </EuiFlexItem>

        {score && showScore && (
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s">
              <Term
                label={i18n.translate(
                  'searchIndexDocuments.result.header.compactCard.metadata.score',
                  {
                    defaultMessage: 'Score',
                  }
                )}
              />
              <Definition label={score?.toString()} />
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {onDocumentDelete && (
        <EuiPopoverFooter>
          <EuiToolTip
            content={
              /* for serverless search users hasDeleteDocumentsPrivilege flag indicates if user has privilege to delete documents, for stack hasDeleteDocumentsPrivilege would be undefined */
              hasDeleteDocumentsPrivilege === false
                ? i18n.translate(
                    'searchIndexDocuments.result.header.compactCard.metadata.deleteDocumentToolTip',
                    {
                      defaultMessage: 'You do not have permision to delete documents',
                    }
                  )
                : undefined
            }
            position="bottom"
            data-test-subj="deleteDocumentButtonToolTip"
          >
            <EuiButton
              iconType="trash"
              color="danger"
              size="s"
              isDisabled={hasDeleteDocumentsPrivilege === false}
              data-test-subj="deleteDocumentButton"
              onClick={(e: React.MouseEvent<HTMLElement>) => {
                e.stopPropagation();
                onDocumentDelete();
                closePopover();
              }}
              fullWidth
            >
              <FormattedMessage
                id="searchIndexDocuments.result.header.compactCard.metadata.deleteDocument"
                defaultMessage="Delete document"
              />
            </EuiButton>
          </EuiToolTip>
        </EuiPopoverFooter>
      )}
    </EuiPopover>
  );
};

const Score: React.FC<{ score: MetaDataProps['score'] }> = ({ score }) => {
  return (
    <EuiPanel paddingSize="xs" hasShadow={false} color="subdued" grow>
      <EuiFlexGroup
        direction="column"
        responsive={false}
        alignItems="center"
        justifyContent="center"
        gutterSize="s"
      >
        <EuiFlexItem grow>
          <EuiIcon type="visGauge" size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow>
          <EuiPanel
            hasShadow={false}
            hasBorder={false}
            css={css`
              inline-size: 5ch;
              max-inline-size: 100%;
            `}
            paddingSize="none"
            color="subdued"
          >
            <EuiText textAlign="center" size="xs">
              {score ? score.toString().substring(0, 5) : '-'}
            </EuiText>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const RichResultHeader: React.FC<Props> = ({
  title,
  metaData,
  rightSideActions = null,
  showScore = false,
  onTitleClick,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexItem
      grow
      css={css`
        min-height: ${euiTheme.base * 1}px;
        max-height: ${euiTheme.base * 8}px;
      `}
    >
      <EuiFlexGroup gutterSize="m" alignItems="center">
        {showScore && (
          <EuiFlexItem grow={false}>
            <Score score={metaData.score} />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <EuiText>
                <EuiFlexGroup alignItems="center" gutterSize="l" responsive={false}>
                  <EuiFlexItem>
                    {onTitleClick ? (
                      <EuiLink onClick={onTitleClick} color="text">
                        <EuiTitle size="s">
                          <h4>{title}</h4>
                        </EuiTitle>
                      </EuiLink>
                    ) : (
                      <EuiTitle size="s">
                        <h4>{title}</h4>
                      </EuiTitle>
                    )}
                  </EuiFlexItem>
                  {!!metaData && (
                    <EuiFlexItem grow={false}>
                      <MetadataPopover {...metaData} showScore={showScore} />
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{rightSideActions}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
