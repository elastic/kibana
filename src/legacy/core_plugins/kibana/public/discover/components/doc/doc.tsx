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
import { IndexPatternsContract } from 'src/plugins/data/public';
import { DocViewer } from '../doc_viewer/doc_viewer';
import { ElasticRequestState, useEsDocSearch } from './use_es_doc_search';
import { ElasticSearchHit, getServices } from '../../kibana_services';

export interface ElasticSearchResult {
  hits: {
    hits: [ElasticSearchHit];
    max_score: number;
  };
  timed_out: boolean;
  took: number;
  shards: Record<string, unknown>;
}

export interface DocProps {
  /**
   * Id of the doc in ES
   */
  id: string;
  /**
   * Index in ES to query
   */
  index: string;
  /**
   * IndexPattern ID used to get IndexPattern entity
   * that's used for adding additional fields (stored_fields, script_fields, docvalue_fields)
   */
  indexPatternId: string;
  /**
   * IndexPatternService to get a given index pattern by ID
   */
  indexPatternService: IndexPatternsContract;
  /**
   * Client of ElasticSearch to use for the query
   */
  esClient: {
    search: (payload: { index: string; body: Record<string, any> }) => Promise<ElasticSearchResult>;
  };
}

export function Doc(props: DocProps) {
  const [reqState, hit, indexPattern] = useEsDocSearch(props);

  return (
    <EuiPageContent>
      {reqState === ElasticRequestState.NotFoundIndexPattern && (
        <EuiCallOut
          color="danger"
          data-test-subj={`doc-msg-notFoundIndexPattern`}
          iconType="alert"
          title={
            <FormattedMessage
              id="kbn.doc.failedToLocateIndexPattern"
              defaultMessage="No index pattern matches ID {indexPatternId}"
              values={{ indexPatternId: props.indexPatternId }}
            />
          }
        />
      )}
      {reqState === ElasticRequestState.NotFound && (
        <EuiCallOut
          color="danger"
          data-test-subj={`doc-msg-notFound`}
          iconType="alert"
          title={
            <FormattedMessage
              id="kbn.doc.failedToLocateDocumentDescription"
              defaultMessage="Cannot find document"
            />
          }
        >
          <FormattedMessage
            id="kbn.doc.couldNotFindDocumentsDescription"
            defaultMessage="No documents match that ID."
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
              defaultMessage="Cannot run search"
            />
          }
        >
          <FormattedMessage
            id="kbn.doc.somethingWentWrongDescription"
            defaultMessage="{indexName} is missing."
            values={{ indexName: props.index }}
          />{' '}
          <EuiLink
            href={`https://www.elastic.co/guide/en/elasticsearch/reference/${
              getServices().metadata.branch
            }/indices-exists.html`}
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

      {reqState === ElasticRequestState.Found && hit !== null && indexPattern && (
        <div data-test-subj="doc-hit">
          <DocViewer hit={hit} indexPattern={indexPattern} />
        </div>
      )}
    </EuiPageContent>
  );
}
