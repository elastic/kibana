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
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCallOut, EuiLink, EuiLoadingSpinner, EuiPageContent } from '@elastic/eui';
import { IndexPattern } from 'ui/index_patterns';
import { metadata } from 'ui/metadata';
import { DocViewer } from '../doc_viewer/doc_viewer';
import { ElasticRequestState, useEsDocSearch } from './use_es_doc_search';

export interface DocProps {
  id: string;
  index: string;
  indexPattern: IndexPattern;
  esClient: any;
}

export function Doc(props: DocProps) {
  const [reqState, hit] = useEsDocSearch(props);

  return (
    <EuiPageContent>
      {reqState === ElasticRequestState.NotFound && (
        <EuiCallOut
          color="danger"
          data-test-subj={`doc-msg-notFound`}
          iconType="alert"
          title={
            <FormattedMessage
              id="kbn.doc.failedToLocateDocumentDescription"
              defaultMessage="Failed to locate document"
            />
          }
        >
          <FormattedMessage
            id="kbn.doc.couldNotFindDocumentsDescription"
            defaultMessage="No documents matching that ID were found."
          />
        </EuiCallOut>
      )}

      {reqState === ElasticRequestState.Error && (
        <EuiCallOut
          color="danger"
          data-test-subj={`doc-msg-error`}
          iconType="alert"
          title={
            <FormattedMessage
              id="kbn.doc.failedToExecuteQueryDescription"
              defaultMessage="Failed to execute query"
            />
          }
        >
          <FormattedMessage
            id="kbn.doc.somethingWentWrongDescription"
            defaultMessage="{indexName} is missing."
            values={{ indexName: props.index }}
          />{' '}
          <EuiLink
            href={`https://www.elastic.co/guide/en/elasticsearch/reference/${metadata.branch}/indices-exists.html`}
            target="_blank"
          >
            <FormattedMessage
              id="kbn.doc.somethingWentWrongDescriptionAddon"
              defaultMessage="Please ensure the index exists."
            />
          </EuiLink>
        </EuiCallOut>
      )}

      {reqState === ElasticRequestState.Loading && (
        <EuiCallOut data-test-subj={`doc-msg-loading`}>
          <EuiLoadingSpinner size="m" />{' '}
          <FormattedMessage id="kbn.doc.loadingDescription" defaultMessage="Loading…" />
        </EuiCallOut>
      )}

      {reqState === ElasticRequestState.Found && hit !== null && (
        <div data-test-subj="doc-hit">
          <DocViewer hit={hit} indexPattern={props.indexPattern} />
        </div>
      )}
    </EuiPageContent>
  );
}
