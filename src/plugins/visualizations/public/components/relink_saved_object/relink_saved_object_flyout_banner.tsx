/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo, useState } from 'react';
import {
  EuiCallOut,
  EuiBadge,
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';
import { XJsonLang } from '@kbn/monaco';
import { calcCountOfMissedSavedObjects } from './relink_saved_object_utils';
import type { RelinkSimpleSavedObject, RelinkSavedObjectMeta } from './types';

interface RelinkSavedObjectFlyoutBannerProps {
  savedObject: RelinkSimpleSavedObject;
  rootSavedObjectMeta: RelinkSavedObjectMeta;
  missedSavedObjectMeta: RelinkSavedObjectMeta;
}

const inspectSavedObjectTitle = (
  <FormattedMessage
    id="visualizations.relinkSavedObjectFlyoutBanner.inspect"
    defaultMessage="Inspect Saved Object"
  />
);

export const RelinkSavedObjectFlyoutBanner = ({
  savedObject,
  rootSavedObjectMeta,
  missedSavedObjectMeta,
}: RelinkSavedObjectFlyoutBannerProps) => {
  const [showCode, setShowCode] = useState(false);

  const title = useMemo(
    () => (
      <FormattedMessage
        id="visualizations.relinkSavedObjectFlyoutBanner.text"
        defaultMessage="Requested {type} {savedObjectId} contains {countBadge} to invalid saved object {missedSavedObjectId}."
        values={{
          type: rootSavedObjectMeta.name ?? rootSavedObjectMeta.type,
          savedObjectId: <EuiBadge color="default">id:{savedObject.id}</EuiBadge>,
          countBadge: (
            <EuiBadge color="default">
              <FormattedMessage
                id="visualizations.relinkSavedObjectFlyoutBanner.countBadge"
                defaultMessage="{n, plural, one {# reference} other {# references}}"
                values={{
                  n: calcCountOfMissedSavedObjects(missedSavedObjectMeta, savedObject.references),
                }}
              />
            </EuiBadge>
          ),
          missedSavedObjectId: (
            <EuiBadge color="default" iconType="alert">
              id:{missedSavedObjectMeta.id}
            </EuiBadge>
          ),
        }}
      />
    ),
    [
      missedSavedObjectMeta,
      rootSavedObjectMeta.name,
      rootSavedObjectMeta.type,
      savedObject.id,
      savedObject.references,
    ]
  );

  return (
    <EuiCallOut iconType="help">
      <p>{title}</p>{' '}
      <EuiButton size="s" iconType="inspect" onClick={() => setShowCode(true)}>
        {inspectSavedObjectTitle}
      </EuiButton>
      {showCode ? (
        <EuiModal style={{ width: 800, minHeight: 400 }} onClose={() => setShowCode(false)}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              <h1>{inspectSavedObjectTitle}</h1>
            </EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <CodeEditor
              width="100%"
              height="100%"
              languageId={XJsonLang.ID}
              value={JSON.stringify(savedObject, null, 2)}
              options={{
                lineNumbers: 'on',
                fontSize: 12,
                minimap: {
                  enabled: false,
                },
                folding: true,
                wordWrap: 'on',
                wrappingIndent: 'indent',
                automaticLayout: true,
              }}
            />
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButton onClick={() => setShowCode(false)} fill>
              <FormattedMessage
                id="visualizations.relinkSavedObjectFlyoutBanner.close"
                defaultMessage="Close"
              />
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      ) : null}
    </EuiCallOut>
  );
};
