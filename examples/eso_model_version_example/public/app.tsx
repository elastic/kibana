/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiAccordion,
  EuiButton,
  EuiCodeBlock,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import React, { useState } from 'react';

export const MyPluginComponent: React.FC = () => {
  const [generated, setGenerated] = useState('');
  const [rawDocs, setRawDocs] = useState('');
  const [objects, setObjects] = useState('');
  const [decrypted, setDecrypted] = useState('');

  const handler = async (
    endpoint: string,
    setter: (value: React.SetStateAction<string>) => void
  ) => {
    const response = await fetch(endpoint);
    const data = await response.json();
    setter(JSON.stringify(data, null, 2));
  };

  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Section grow={false} color="subdued" bottomBorder="extended">
        <EuiTitle size="l">
          <h1>Encrypted Saved Object Model Version Example</h1>
        </EuiTitle>
        <EuiText>
          This is a demonstration to show the results of the implementation found in&nbsp;
          <EuiTextColor color="accent">examples/eso_model_version_example</EuiTextColor>
        </EuiText>
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section
        grow={false}
        color="subdued"
        bottomBorder="extended"
        title="Create Objects"
      >
        <EuiText>
          1. This will create three objects - one for each model version definition (see&nbsp;
          <EuiTextColor color="accent">
            examples/eso_model_version_example/server/types
          </EuiTextColor>
          ).
        </EuiText>
        <EuiButton
          onClick={() => {
            handler('/internal/eso_mv_example/generate', setGenerated);
          }}
        >
          Create Objects
        </EuiButton>
        <EuiSpacer />
        <EuiAccordion
          id="createdObjectsAccordion"
          buttonContent="Created Objects"
          initialIsOpen={true}
        >
          <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable>
            {generated}
          </EuiCodeBlock>
        </EuiAccordion>
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section grow={false} color="subdued" bottomBorder="extended">
        <EuiText>
          2. This will read the raw documents of the objects with an Elasticsearch client. Note that
          the&nbsp;
          <EuiTextColor color="accent">typeMigrationVersion&nbsp;</EuiTextColor>
          (10.n.0) will correspond to the model version (n).
        </EuiText>
        <EuiButton
          onClick={() => {
            handler('/internal/eso_mv_example/read_raw', setRawDocs);
          }}
        >
          Read Raw Documents
        </EuiButton>
        <EuiSpacer />
        <EuiAccordion
          id="rawDocumentsAccordion"
          buttonContent="Raw Object Documents"
          initialIsOpen={true}
        >
          <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable>
            {rawDocs}
          </EuiCodeBlock>
        </EuiAccordion>
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section grow={false} color="subdued" bottomBorder="extended">
        <EuiText>
          3. This will read the saved objects with a Kibana saved object client. Note that the
          objects have been migrated on read to the latest model version, and the encrypted fields
          have been stripped.
        </EuiText>
        <EuiButton
          onClick={() => {
            handler('/internal/eso_mv_example/get_objects', setObjects);
          }}
        >
          Read Saved Objects
        </EuiButton>
        <EuiSpacer />
        <EuiAccordion
          id="migratedObjectsAccordion"
          buttonContent="Migrated Objects"
          initialIsOpen={true}
        >
          <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable>
            {objects}
          </EuiCodeBlock>
        </EuiAccordion>
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section grow={false} color="subdued" bottomBorder="extended">
        <EuiText>4. This will decrypt the saved objects.</EuiText>
        <EuiButton
          onClick={() => {
            handler('/internal/eso_mv_example/get_decrypted', setDecrypted);
          }}
        >
          Decrypt Secrets
        </EuiButton>
        <EuiSpacer />
        <EuiAccordion
          id="decryptedAccordion"
          buttonContent="Decrypted Secrets"
          initialIsOpen={true}
        >
          <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable>
            {decrypted}
          </EuiCodeBlock>
        </EuiAccordion>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
