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
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { ResultFields } from './results_fields';

import './result.scss';
import { MetaDataProps, ResultFieldProps } from './result_types';
import { RichResultHeader } from './rich_result_header';
import { ResultHeader } from './result_header';

export const DEFAULT_VISIBLE_FIELDS = 3;

export interface ResultProps {
  fields: ResultFieldProps[];
  metaData: MetaDataProps;
  defaultVisibleFields?: number;
  showScore?: boolean;
  compactCard?: boolean;
  onDocumentClick?: () => void;
}

export const Result: React.FC<ResultProps> = ({
  metaData,
  fields,
  defaultVisibleFields = DEFAULT_VISIBLE_FIELDS,
  compactCard = true,
  showScore = false,
  onDocumentClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const tooltipText =
    fields.length <= defaultVisibleFields
      ? i18n.translate('searchIndexDocuments.result.expandTooltip.allVisible', {
          defaultMessage: 'All fields are visible',
        })
      : isExpanded
      ? i18n.translate('searchIndexDocuments.result.expandTooltip.showFewer', {
          defaultMessage: 'Show {amount} fewer fields',
          values: { amount: fields.length - defaultVisibleFields },
        })
      : i18n.translate('searchIndexDocuments.result.expandTooltip.showMore', {
          defaultMessage: 'Show {amount} more fields',
          values: { amount: fields.length - defaultVisibleFields },
        });
  const toolTipContent = <>{tooltipText}</>;

  return (
    <EuiPanel
      hasBorder
      data-test-subj="search-index-documents-result"
      paddingSize={compactCard ? 's' : 'l'}
    >
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem>
          <EuiFlexGroup
            direction="column"
            gutterSize="none"
            responsive={false}
            justifyContent="spaceAround"
          >
            <EuiFlexItem grow={false}>
              {compactCard && (
                <ResultHeader
                  title={
                    metaData.title ??
                    i18n.translate('searchIndexDocuments.result.title.id', {
                      defaultMessage: 'Document id: {id}',
                      values: { id: metaData.id },
                    })
                  }
                  metaData={metaData}
                />
              )}
              {!compactCard && (
                <RichResultHeader
                  showScore={showScore}
                  title={
                    metaData.title ??
                    i18n.translate('searchIndexDocuments.result.title.id', {
                      defaultMessage: 'Document id: {id}',
                      values: { id: metaData.id },
                    })
                  }
                  onTitleClick={onDocumentClick}
                  metaData={metaData}
                  rightSideActions={
                    <EuiFlexItem grow={false}>
                      <EuiToolTip position="left" content={toolTipContent}>
                        <EuiButtonIcon
                          iconType={isExpanded ? 'fold' : 'unfold'}
                          color={isExpanded ? 'danger' : 'primary'}
                          onClick={(e: React.MouseEvent<HTMLElement>) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                          }}
                          aria-label={tooltipText}
                        />
                      </EuiToolTip>
                    </EuiFlexItem>
                  }
                />
              )}
            </EuiFlexItem>
            <EuiFlexItem>
              {!compactCard &&
                ((isExpanded && fields.length > 0) ||
                  (!isExpanded && fields.slice(0, defaultVisibleFields).length > 0)) && (
                  <EuiSpacer size="l" />
                )}
              <ResultFields
                isExpanded={isExpanded}
                fields={isExpanded ? fields : fields.slice(0, defaultVisibleFields)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {compactCard && (
          <EuiFlexItem grow={false}>
            <div className="resultExpandColumn">
              <EuiToolTip position="left" content={toolTipContent}>
                <EuiButtonIcon
                  iconType={isExpanded ? 'fold' : 'unfold'}
                  color="text"
                  onClick={(e: React.MouseEvent<HTMLElement>) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                  aria-label={tooltipText}
                />
              </EuiToolTip>
            </div>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
