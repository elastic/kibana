/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { firstValueFrom } from 'rxjs';
import { EuiCallOut, EuiLink, EuiLoadingSpinner, EuiPage, EuiPageBody } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';
import { useEsDocSearch } from '@kbn/unified-doc-viewer-plugin/public';
import type { EsDocSearchProps } from '@kbn/unified-doc-viewer-plugin/public/types';
import { setBreadcrumbs } from '../../../utils/breadcrumbs';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import { SingleDocViewer } from './single_doc_viewer';
import { createDataViewDataSource } from '../../../../common/data_sources';

export interface DocProps extends EsDocSearchProps {
  /**
   * Discover main view url
   */
  referrer?: string;
}

export function Doc(props: DocProps) {
  const { dataView } = props;
  const services = useDiscoverServices();
  const { locator, chrome, docLinks, core, profilesManager } = services;
  const indexExistsLink = docLinks.links.apis.indexExists;

  const onBeforeFetch = useCallback(async () => {
    const solutionNavId = await firstValueFrom(core.chrome.getActiveSolutionNavId$());
    await profilesManager.resolveRootProfile({ solutionNavId });
    await profilesManager.resolveDataSourceProfile({
      dataSource: dataView?.id ? createDataViewDataSource({ dataViewId: dataView.id }) : undefined,
      dataView,
      query: { query: '', language: 'kuery' },
    });
  }, [profilesManager, core, dataView]);

  const onProcessRecord = useCallback(
    (record) => {
      return profilesManager.resolveDocumentProfile({ record });
    },
    [profilesManager]
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
          <EuiCallOut
            color="danger"
            data-test-subj={`doc-msg-notFoundDataView`}
            iconType="warning"
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
          <EuiCallOut
            color="danger"
            data-test-subj={`doc-msg-notFound`}
            iconType="warning"
            title={
              <FormattedMessage
                id="discover.doc.failedToLocateDocumentDescription"
                defaultMessage="Cannot find document"
              />
            }
          >
            <FormattedMessage
              id="discover.doc.couldNotFindDocumentsDescription"
              defaultMessage="No documents match that ID."
            />
          </EuiCallOut>
        )}

        {reqState === ElasticRequestState.Error && (
          <EuiCallOut
            color="danger"
            data-test-subj={`doc-msg-error`}
            iconType="warning"
            title={
              <FormattedMessage
                id="discover.doc.failedToExecuteQueryDescription"
                defaultMessage="Cannot run search"
              />
            }
          >
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
          </EuiCallOut>
        )}

        {reqState === ElasticRequestState.Loading && (
          <EuiCallOut data-test-subj={`doc-msg-loading`}>
            <EuiLoadingSpinner size="m" />{' '}
            <FormattedMessage id="discover.doc.loadingDescription" defaultMessage="Loading…" />
          </EuiCallOut>
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
