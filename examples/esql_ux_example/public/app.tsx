/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
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
import ESQLEditor from '@kbn/esql-editor';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { StartDependencies } from './plugin';

const initialQuery: AggregateQuery = { esql: 'FROM index | LIMIT 10' };

export const App = ({ core, plugins }: { core: CoreStart; plugins: StartDependencies }) => {
  const [querySubmitted, setQuerySubmitted] = useState(false);

  // Services required by ESQLEditor (see ESQLEditorDeps type)
  const services = useMemo(
    () => ({
      core,
      data: plugins.data,
      uiActions: plugins.uiActions,
      storage: new Storage(localStorage), // see embeddable_examples
    }),
    [core, plugins]
  );

  return (
    <KibanaContextProvider services={services}>
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
              <ESQLEditor
                query={initialQuery}
                onTextLangQueryChange={() => {}}
                onTextLangQuerySubmit={async () => {
                  setQuerySubmitted(true);
                }}
                dataTestSubj="esqlUxExampleEditor"
                hideRunQueryText={false}
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
    </KibanaContextProvider>
  );
};
