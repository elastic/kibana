/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import type { DocLinksStart } from '@kbn/core/public';

const ESQL_TECH_PREVIEW_CALLOUT = 'ESQL_TECH_PREVIEW_CALLOUT_HIDDEN';

interface SelectedVSAvailableCallout {
  isPlainRecord: boolean;
  docLinks: DocLinksStart;
}

export const TechPreviewCallout = ({ isPlainRecord, docLinks }: SelectedVSAvailableCallout) => {
  const [hideCallout, setHideCallout] = useLocalStorage(ESQL_TECH_PREVIEW_CALLOUT, false);

  const onDismiss = useCallback(() => {
    setHideCallout(!hideCallout);
  }, [hideCallout, setHideCallout]);

  return (
    <>
      {isPlainRecord && !hideCallout && (
        <>
          <EuiCallOut
            title={
              <FormattedMessage
                id="discover.textBasedMode.techPreviewCalloutMessage"
                defaultMessage="ES|QL is currently in technical preview. Find more information in the {link}."
                values={{
                  link: (
                    <EuiLink href={docLinks.links.query.queryESQL} target="_blank">
                      <FormattedMessage
                        id="discover.textBasedMode.techPreviewCalloutLink"
                        defaultMessage="documentation"
                      />
                    </EuiLink>
                  ),
                }}
              />
            }
            color="primary"
            iconType="beaker"
            onDismiss={onDismiss}
            size="s"
          />
        </>
      )}
    </>
  );
};
