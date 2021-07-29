/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiBetaBadge, EuiCode, EuiLink, EuiPageHeader, EuiSpacer, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { DocLinksStart } from 'kibana/public';
import { useKibana } from '../../../../../../../plugins/kibana_react/public';
import { IndexPatternManagmentContext } from '../../../../types';

export const Header = ({
  prompt,
  indexPatternName,
  isBeta = false,
  docLinks,
}: {
  prompt?: React.ReactNode;
  indexPatternName: string;
  isBeta?: boolean;
  docLinks: DocLinksStart;
}) => {
  const changeTitle = useKibana<IndexPatternManagmentContext>().services.chrome.docTitle.change;
  const createIndexPatternHeader = i18n.translate(
    'indexPatternManagement.createIndexPatternHeader',
    {
      defaultMessage: 'Create {indexPatternName}',
      values: { indexPatternName },
    }
  );

  changeTitle(createIndexPatternHeader);

  return (
    <EuiPageHeader
      pageTitle={
        <>
          {createIndexPatternHeader}
          {isBeta ? (
            <>
              {' '}
              <EuiBetaBadge
                label={i18n.translate('indexPatternManagement.createIndexPattern.betaLabel', {
                  defaultMessage: 'Beta',
                })}
              />
            </>
          ) : null}
        </>
      }
      bottomBorder
    >
      <EuiText>
        <p>
          <FormattedMessage
            id="indexPatternManagement.createIndexPattern.description"
            defaultMessage="An index pattern can match a single source, for example, {single}, or {multiple} data sources, {star}."
            values={{
              multiple: <strong>multiple</strong>,
              single: <EuiCode>filebeat-4-3-22</EuiCode>,
              star: <EuiCode>filebeat-*</EuiCode>,
            }}
          />
          <br />
          <EuiLink href={docLinks.links.indexPatterns.introduction} target="_blank" external>
            <FormattedMessage
              id="indexPatternManagement.createIndexPattern.documentation"
              defaultMessage="Read documentation"
            />
          </EuiLink>
        </p>
      </EuiText>
      {prompt ? (
        <>
          <EuiSpacer size="m" />
          {prompt}
        </>
      ) : null}
    </EuiPageHeader>
  );
};
