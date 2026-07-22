/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiLink, EuiLoadingSpinner, EuiPage, EuiPageBody } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';
import { useEsDocSearch } from '@kbn/unified-doc-viewer-plugin/public';
import type { EsDocSearchProps } from '@kbn/unified-doc-viewer-plugin/public/types';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { KbnDangerCallout, KbnInfoCallout } from '@kbn/ui-callout';
import { setBreadcrumbs } from '../../../utils/breadcrumbs';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import { SingleDocViewer } from './single_doc_viewer';
import { createDataViewDataSource } from '../../../../common/data_sources';
import { useScopedServices } from '../../../components/scoped_services_provider';

export interface DocProps extends EsDocSearchProps {
  /**
   * Discover main view url
   */
  referrer?: string;
}

export function Doc(props: DocProps) {
  const { dataView } = props;
  const { scopedProfilesManager } = useScopedServices();
  const services = useDiscoverServices();
  const { locator, chrome, docLinks } = services;
  const indexExistsLink = docLinks.links.apis.indexExists;

  const onBeforeFetch = useCallback(async () => {
    await scopedProfilesManager.resolveDataSourceProfile({
      dataSource: dataView?.id ? createDataViewDataSource({ dataViewId: dataView.id }) : undefined,
      dataView,
      query: { query: '', language: 'kuery' },
    });
  }, [scopedProfilesManager, dataView]);

  const onProcessRecord = useCallback(
    (record: DataTableRecord) => {
      return scopedProfilesManager.resolveDocumentProfile({ record });
    },
    [scopedProfilesManager]
  );

  const [reqState, record] = useEsDocSearch({
    ...props,
    onBeforeFetch,
    onProcessRecord,
  });

  useEffect(() => {
    setBreadcrumbs({
      services,
      titleBreadcrumbText: `${props.index}#${props.id}`,
      rootBreadcrumbPath: props.referrer,
    });
  }, [chrome, props.referrer, props.index, props.id, dataView, locator, services]);

  return (
    <EuiPage>
      <h1
        id="singleDocTitle"
        className="euiScreenReaderOnly"
        data-test-subj="discoverSingleDocTitle"
      >
        {i18n.translate('discover.doc.pageTitle', {
          defaultMessage: 'Single document - #{id}',
          values: { id: props.id },
        })}
      </h1>
      <EuiPageBody panelled paddingSize="m" panelProps={{ role: 'main' }}>
        {reqState === ElasticRequestState.NotFoundDataView && (
          <KbnDangerCallout
            announceOnMount
            data-test-subj={`doc-msg-notFoundDataView`}
            title={
              <FormattedMessage
                id="discover.doc.failedToLocateDataView"
                defaultMessage="No data view matches ID {dataViewId}."
                values={{ dataViewId: dataView.id }}
              />
            }
          />
        )}
        {reqState === ElasticRequestState.NotFound && (
          <KbnDangerCallout
            announceOnMount
            data-test-subj={`doc-msg-notFound`}
            title={
              <FormattedMessage
                id="discover.doc.failedToLocateDocumentDescription"
                defaultMessage="Cannot find document"
              />
            }
            text={
              <FormattedMessage
                id="discover.doc.couldNotFindDocumentsDescription"
                defaultMessage="No documents match that ID."
              />
            }
          />
        )}

        {reqState === ElasticRequestState.Error && (
          <KbnDangerCallout
            announceOnMount
            data-test-subj={`doc-msg-error`}
            title={
              <FormattedMessage
                id="discover.doc.failedToExecuteQueryDescription"
                defaultMessage="Cannot run search"
              />
            }
            text={
              <p>
                <FormattedMessage
                  id="discover.doc.somethingWentWrongDescription"
                  defaultMessage="{indexName} is missing."
                  values={{ indexName: props.index }}
                />{' '}
                <EuiLink href={indexExistsLink} target="_blank">
                  <FormattedMessage
                    id="discover.doc.somethingWentWrongDescriptionAddon"
                    defaultMessage="Please ensure the index exists."
                  />
                </EuiLink>
              </p>
            }
          />
        )}

        {reqState === ElasticRequestState.Loading && (
          <KbnInfoCallout
            title={
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiLoadingSpinner size="m" />
                <FormattedMessage id="discover.doc.loadingDescription" defaultMessage="Loading…" />
              </EuiFlexGroup>
            }
            announceOnMount
            data-test-subj={`doc-msg-loading`}
          />
        )}

        {reqState === ElasticRequestState.Found && record !== null && dataView && (
          <div data-test-subj="doc-hit">
            <SingleDocViewer record={record} dataView={dataView} />
          </div>
        )}
      </EuiPageBody>
    </EuiPage>
  );
}
