/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import './import_summary.scss';
import _ from 'lodash';
import React, { Fragment } from 'react';
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiIcon,
  EuiIconTip,
  EuiHorizontalRule,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { SavedObjectsImportSuccess } from 'kibana/public';
import { FailedImport } from '../../..';
import { getDefaultTitle, getSavedObjectLabel } from '../../../lib';

const DEFAULT_ICON = 'apps';

export interface ImportSummaryProps {
  failedImports: FailedImport[];
  successfulImports: SavedObjectsImportSuccess[];
}

interface ImportItem {
  type: string;
  id: string;
  title: string;
  icon: string;
  outcome: 'created' | 'overwritten' | 'error';
  errorMessage?: string;
}

const unsupportedTypeErrorMessage = i18n.translate(
  'savedObjectsManagement.objectsTable.importSummary.unsupportedTypeError',
  { defaultMessage: 'Unsupported object type' }
);

const getErrorMessage = ({ error }: FailedImport) => {
  if (error.type === 'unknown') {
    return error.message;
  } else if (error.type === 'unsupported_type') {
    return unsupportedTypeErrorMessage;
  }
};

const mapFailedImport = (failure: FailedImport): ImportItem => {
  const { obj } = failure;
  const { type, id, meta } = obj;
  const title = meta.title || getDefaultTitle(obj);
  const icon = meta.icon || DEFAULT_ICON;
  const errorMessage = getErrorMessage(failure);
  return { type, id, title, icon, outcome: 'error', errorMessage };
};

const mapImportSuccess = (obj: SavedObjectsImportSuccess): ImportItem => {
  const { type, id, meta, overwrite } = obj;
  const title = meta.title || getDefaultTitle(obj);
  const icon = meta.icon || DEFAULT_ICON;
  const outcome = overwrite ? 'overwritten' : 'created';
  return { type, id, title, icon, outcome };
};

const getCountIndicators = (importItems: ImportItem[]) => {
  if (!importItems.length) {
    return null;
  }

  const outcomeCounts = importItems.reduce(
    (acc, { outcome }) => acc.set(outcome, (acc.get(outcome) ?? 0) + 1),
    new Map<ImportItem['outcome'], number>()
  );
  const createdCount = outcomeCounts.get('created');
  const overwrittenCount = outcomeCounts.get('overwritten');
  const errorCount = outcomeCounts.get('error');

  return (
    <EuiFlexGroup>
      {createdCount && (
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h4 className="savedObjectsManagementImportSummary__createdCount">
              <FormattedMessage
                id="savedObjectsManagement.importSummary.createdCountHeader"
                defaultMessage="{createdCount} new"
                values={{ createdCount }}
              />
            </h4>
          </EuiTitle>
        </EuiFlexItem>
      )}
      {overwrittenCount && (
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h4 className="savedObjectsManagementImportSummary__overwrittenCount">
              <FormattedMessage
                id="savedObjectsManagement.importSummary.overwrittenCountHeader"
                defaultMessage="{overwrittenCount} overwritten"
                values={{ overwrittenCount }}
              />
            </h4>
          </EuiTitle>
        </EuiFlexItem>
      )}
      {errorCount && (
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h4 className="savedObjectsManagementImportSummary__errorCount">
              <FormattedMessage
                id="savedObjectsManagement.importSummary.errorCountHeader"
                defaultMessage="{errorCount} error"
                values={{ errorCount }}
              />
            </h4>
          </EuiTitle>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const getStatusIndicator = ({ outcome, errorMessage }: ImportItem) => {
  switch (outcome) {
    case 'created':
      return (
        <EuiIconTip
          type={'checkInCircleFilled'}
          color={'success'}
          content={i18n.translate('savedObjectsManagement.importSummary.createdOutcomeLabel', {
            defaultMessage: 'Created',
          })}
        />
      );
    case 'overwritten':
      return (
        <EuiIconTip
          type={'check'}
          content={i18n.translate('savedObjectsManagement.importSummary.overwrittenOutcomeLabel', {
            defaultMessage: 'Overwritten',
          })}
        />
      );
    case 'error':
      return (
        <EuiIconTip
          type={'alert'}
          color={'danger'}
          content={i18n.translate('savedObjectsManagement.importSummary.errorOutcomeLabel', {
            defaultMessage: 'Error{message}',
            values: { message: errorMessage ? `: ${errorMessage}` : '' },
          })}
        />
      );
  }
};

export const ImportSummary = ({ failedImports, successfulImports }: ImportSummaryProps) => {
  const importItems: ImportItem[] = _.sortBy(
    [
      ...failedImports.map((x) => mapFailedImport(x)),
      ...successfulImports.map((x) => mapImportSuccess(x)),
    ],
    ['type', 'title']
  );

  return (
    <Fragment>
      <EuiTitle
        size="s"
        data-test-subj={
          importItems.length ? 'importSavedObjectsSuccess' : 'importSavedObjectsSuccessNoneImported'
        }
      >
        <h3>
          <FormattedMessage
            id="savedObjectsManagement.importSummary.headerLabel"
            defaultMessage="{importCount} object(s) imported"
            values={{ importCount: importItems.length }}
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      {getCountIndicators(importItems)}
      <EuiHorizontalRule />
      {importItems.map((item, index) => {
        const { type, title, icon } = item;
        return (
          <EuiFlexGroup
            responsive={false}
            key={index}
            alignItems="center"
            gutterSize="s"
            className="savedObjectsManagementImportSummary__row"
          >
            <EuiFlexItem grow={false}>
              <EuiToolTip position="top" content={getSavedObjectLabel(type)}>
                <EuiIcon aria-label={getSavedObjectLabel(type)} type={icon} size="s" />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem className="savedObjectsManagementImportSummary__title">
              <EuiText size="s">
                <p className="eui-textTruncate" title={title}>
                  {title}
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <div className="eui-textRight">{getStatusIndicator(item)}</div>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      })}
    </Fragment>
  );
};
