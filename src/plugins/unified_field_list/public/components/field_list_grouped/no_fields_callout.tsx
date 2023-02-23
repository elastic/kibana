/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const defaultNoFieldsMessageCopy = i18n.translate(
  'unifiedFieldList.fieldList.noFieldsCallout.noDataLabel',
  {
    defaultMessage: 'There are no fields.',
  }
);

export const NoFieldsCallout = ({
  fieldsExistInIndex,
  defaultNoFieldsMessage = defaultNoFieldsMessageCopy,
  isAffectedByFieldFilter = false,
  isAffectedByTimerange = false,
  isAffectedByGlobalFilter = false,
  'data-test-subj': dataTestSubject = 'noFieldsCallout',
}: {
  fieldsExistInIndex: boolean;
  isAffectedByFieldFilter?: boolean;
  defaultNoFieldsMessage?: string;
  isAffectedByTimerange?: boolean;
  isAffectedByGlobalFilter?: boolean;
  'data-test-subj'?: string;
}) => {
  if (!fieldsExistInIndex) {
    return (
      <EuiCallOut
        size="s"
        color="warning"
        title={i18n.translate('unifiedFieldList.fieldList.noFieldsCallout.noFieldsLabel', {
          defaultMessage: 'No fields exist in this data view.',
        })}
        data-test-subj={`${dataTestSubject}-noFieldsExist`}
      />
    );
  }

  return (
    <EuiCallOut
      size="s"
      color="warning"
      title={
        isAffectedByFieldFilter
          ? i18n.translate('unifiedFieldList.fieldList.noFieldsCallout.noFilteredFieldsLabel', {
              defaultMessage: 'No fields match the selected filters.',
            })
          : defaultNoFieldsMessage
      }
      data-test-subj={`${dataTestSubject}-noFieldsMatch`}
    >
      {(isAffectedByTimerange || isAffectedByFieldFilter || isAffectedByGlobalFilter) && (
        <>
          <strong>
            {i18n.translate('unifiedFieldList.fieldList.noFieldsCallout.noFields.tryText', {
              defaultMessage: 'Try:',
            })}
          </strong>
          <ul>
            {isAffectedByTimerange && (
              <li>
                {i18n.translate(
                  'unifiedFieldList.fieldList.noFieldsCallout.noFields.extendTimeBullet',
                  {
                    defaultMessage: 'Extending the time range',
                  }
                )}
              </li>
            )}
            {isAffectedByFieldFilter && (
              <li>
                {i18n.translate(
                  'unifiedFieldList.fieldList.noFieldsCallout.noFields.fieldTypeFilterBullet',
                  {
                    defaultMessage: 'Using different field filters',
                  }
                )}
              </li>
            )}
            {isAffectedByGlobalFilter && (
              <li>
                {i18n.translate(
                  'unifiedFieldList.fieldList.noFieldsCallout.noFields.globalFiltersBullet',
                  {
                    defaultMessage: 'Changing the global filters',
                  }
                )}
              </li>
            )}
          </ul>
        </>
      )}
    </EuiCallOut>
  );
};
