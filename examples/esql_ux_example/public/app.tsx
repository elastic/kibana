/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageSection,
  EuiPageHeader,
  EuiPanel,
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';

import type { CoreStart } from '@kbn/core/public';
import type { AggregateQuery } from '@kbn/es-query';
import { ESQLLangEditor } from '@kbn/esql/public';
import type { StartDependencies } from './plugin';

const initialQuery: AggregateQuery = {
  esql: 'FROM logstash-*',
};

export const App = ({ core, plugins }: { core: CoreStart; plugins: StartDependencies }) => {
  const [query, setQuery] = useState<AggregateQuery>(initialQuery);
  const [querySubmitted, setQuerySubmitted] = useState(false);

  const onTextLangQueryChange = useCallback((newQuery: AggregateQuery) => {
    setQuery(newQuery);
  }, []);

  return (
    <EuiPage>
      <EuiPageBody css={{ maxWidth: 800, margin: '0 auto' }}>
        <EuiPageHeader
          paddingSize="s"
          bottomBorder={true}
          pageTitle="ES|QL Editor UX Example"
          description="Test the ES|QL editor component for autocomplete, suggestions, and UI interactions."
        />
        <EuiPageSection paddingSize="s">
          <EuiPanel hasBorder>
            <ESQLLangEditor
              query={query}
              onTextLangQueryChange={onTextLangQueryChange}
              onTextLangQuerySubmit={async () => {
                setQuerySubmitted(true);
              }}
              hasOutline
            />
          </EuiPanel>
          {querySubmitted && (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut
                title="Query submitted"
                color="success"
                iconType="check"
                data-test-subj="querySubmittedCallout"
                announceOnMount
              />
            </>
          )}
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
};
