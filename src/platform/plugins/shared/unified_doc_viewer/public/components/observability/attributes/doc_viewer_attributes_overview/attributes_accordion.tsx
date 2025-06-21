/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import {
  EuiAccordion,
  EuiText,
  EuiNotificationBadge,
  EuiEmptyPrompt,
  EuiIconTip,
  useEuiTheme,
} from '@elastic/eui';
import { DataTableColumnsMeta, DataTableRecord } from '@kbn/discover-utils';
import { DataView } from '@kbn/data-views-plugin/common';
import { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import { i18n } from '@kbn/i18n';
import { AttributesTable } from './attributes_table';

interface AttributesAccordionProps {
  id: string;
  title: string;
  ariaLabel: string;
  tooltipMessage: string;
  fields: string[];
  hit: DataTableRecord;
  dataView: DataView;
  columns?: string[];
  columnsMeta?: DataTableColumnsMeta;
  searchTerm: string;
  onAddColumn?: (col: string) => void;
  onRemoveColumn?: (col: string) => void;
  filter?: DocViewFilterFn;
  isEsqlMode: boolean;
}

export const AttributesAccordion = ({
  id,
  title,
  tooltipMessage,
  fields,
  hit,
  dataView,
  columns,
  columnsMeta,
  searchTerm,
  onAddColumn,
  onRemoveColumn,
  filter,
  isEsqlMode = false,
}: AttributesAccordionProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiAccordion
      id={id}
      buttonContent={
        <EuiText size="s">
          <strong css={{ marginRight: euiTheme.size.xs }}>{title}</strong>
          <EuiIconTip
            aria-label={tooltipMessage}
            type="questionInCircle"
            color="subdued"
            size="s"
            position="right"
            content={tooltipMessage}
            iconProps={{
              className: 'eui-alignTop',
            }}
          />
        </EuiText>
      }
      initialIsOpen={fields.length > 0}
      extraAction={
        <EuiNotificationBadge size="m" color="subdued">
          {fields.length}
        </EuiNotificationBadge>
      }
      paddingSize="m"
    >
      {fields.length === 0 ? (
        <EuiEmptyPrompt
          layout="horizontal"
          body={
            <EuiText size="s" color="subdued">
              <p>
                {i18n.translate(
                  'unifiedDocViewer.docView.attributes.accordion.noFieldsMessage.noFieldsLabel',
                  {
                    defaultMessage: 'No attributes fields found.',
                  }
                )}
              </p>

              <>
                <strong>
                  {i18n.translate(
                    'unifiedDocViewer.docView.attributes.accordion.noFieldsMessage.tryText',
                    {
                      defaultMessage: 'Try:',
                    }
                  )}
                </strong>
                <ul>
                  <li>
                    {i18n.translate(
                      'unifiedDocViewer.docView.attributes.accordion.noFieldsMessage.extendTimeBullet',
                      {
                        defaultMessage: 'Extending the time range',
                      }
                    )}
                  </li>

                  <li>
                    {i18n.translate(
                      'unifiedDocViewer.docView.attributes.accordion.noFieldsMessage.fieldTypeFilterBullet',
                      {
                        defaultMessage: 'Using different field filters',
                      }
                    )}
                  </li>
                </ul>
              </>
            </EuiText>
          }
          data-test-subj="attributesAccordionEmptyPrompt"
        />
      ) : (
        <AttributesTable
          hit={hit}
          dataView={dataView}
          columns={columns}
          columnsMeta={columnsMeta}
          fields={fields}
          searchTerm={searchTerm}
          onAddColumn={onAddColumn}
          onRemoveColumn={onRemoveColumn}
          filter={filter}
          isEsqlMode={isEsqlMode}
        />
      )}
    </EuiAccordion>
  );
};
