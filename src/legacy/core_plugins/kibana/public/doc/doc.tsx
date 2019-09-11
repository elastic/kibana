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
import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/target/types/react';
import { EuiCallOut, EuiLoadingSpinner, EuiPageContent } from '@elastic/eui';
import { IndexPattern } from 'src/legacy/core_plugins/data/public/index_patterns/index_patterns';
import { ElasticSearchHit } from 'ui/registry/doc_views_types';
import { DocViewer } from '../doc_viewer/doc_viewer';
import { searchDocById } from './search_doc_by_id';

export function Doc({
  id,
  index,
  indexPattern,
  es,
}: {
  id: string;
  index: string;
  indexPattern: IndexPattern;
  es: any;
}) {
  const [status, setStatus] = useState('loading');
  const [hit, setHit] = useState<ElasticSearchHit | null>(null);

  async function requestData() {
    const result = await searchDocById(id, index, es, indexPattern);
    setHit(result.hit ? result.hit : null);
    setStatus(result.status);
  }

  useEffect(() => {
    requestData();
  }, []);

  return (
    <EuiPageContent>
      {status === 'notFound' && (
        <EuiCallOut
          color="danger"
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
            defaultMessage="Unfortunately I could not find any documents matching that id, of that type, in that index. I tried really hard. I wanted it to be there. Sometimes I swear documents grow legs and just walk out of the index. Sneaky. I wish I could offer some advice here, something to make you feel better"
          />
        </EuiCallOut>
      )}

      {status === 'error' && (
        <EuiCallOut
          title={
            <FormattedMessage
              id="kbn.doc.failedToExecuteQueryDescription"
              defaultMessage="Failed to execute query"
            />
          }
          color="danger"
          iconType="alert"
        >
          <FormattedMessage
            id="kbn.doc.somethingWentWrongDescription"
            defaultMessage="Oh no. Something went very wrong. Its not just that I couldn't find your document, I couldn't even try. The index was missing, or the type. Go check out Elasticsearch, something isn't quite right here."
          />
        </EuiCallOut>
      )}

      {status === 'loading' && (
        <EuiCallOut>
          <EuiLoadingSpinner size="m" />{' '}
          <FormattedMessage id="kbn.doc.loadingDescription" defaultMessage="Loading…" />
        </EuiCallOut>
      )}

      {status === 'found' && hit !== null && (
        <div data-test-subj="doc-hit">
          <DocViewer hit={hit} indexPattern={indexPattern} />
        </div>
      )}
    </EuiPageContent>
  );
}
