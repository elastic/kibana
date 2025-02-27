/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiStatelessTourSteps, EuiLink, EuiText } from '@elastic/eui';
import { DocLinksStart } from '@kbn/core-doc-links-browser';

const commonProps = {
  stepsTotal: 5,
  maxWidth: 400,
};

export function getTourSteps(docLinks: DocLinksStart['links']) {
  return [
    {
      step: 1,
      title: i18n.translate('console.tour.shellStepTitle', {
        defaultMessage: 'Welcome to the Console',
      }),
      content: (
        <EuiText>
          {i18n.translate('console.tour.shellStepContent', {
            defaultMessage:
              'Console is an interactive UI for calling Elasticsearch and Kibana APIs and viewing their responses. Use Query DSL syntax to search your data, manage settings, and more.',
          })}
        </EuiText>
      ),
      anchorPosition: 'downLeft',
      'data-test-subj': 'shellTourStep',
      ...commonProps,
    },
    {
      step: 2,
      title: i18n.translate('console.tour.editorStepTitle', {
        defaultMessage: 'Get started querying',
      }),
      content: (
        <EuiText>
          <FormattedMessage
            id="console.tour.editorStepContent"
            defaultMessage="Enter a request in this input pane, and view the response in the adjacent output pane. For more details, visit {queryDslDocs}."
            values={{
              queryDslDocs: (
                <EuiLink href={docLinks.query.queryDsl} target="_blank">
                  QueryDSL documentation
                </EuiLink>
              ),
            }}
          />
        </EuiText>
      ),
      anchorPosition: 'rightUp',
      'data-test-subj': 'editorTourStep',
      css: {
        position: 'absolute',
        top: '40%',
        left: '15%',
        transform: 'translateY(10px)',
      },
      ...commonProps,
    },
    {
      step: 3,
      title: i18n.translate('console.tour.historyStepTitle', {
        defaultMessage: 'Revisit past queries',
      }),
      content: (
        <EuiText>
          {i18n.translate('console.tour.historyStepContent', {
            defaultMessage:
              'The history panel keeps track of your past queries, making it easy to review and rerun them.',
          })}
        </EuiText>
      ),
      anchorPosition: 'rightUp',
      'data-test-subj': 'historyTourStep',
      ...commonProps,
    },
    {
      step: 4,
      title: i18n.translate('console.tour.configStepTitle', {
        defaultMessage: 'Customize your toolbox',
      }),
      content: (
        <EuiText>
          {i18n.translate('console.tour.configStepContent', {
            defaultMessage:
              'Fine-tune your Console’s settings and create variables to personalize your workflow.',
          })}
        </EuiText>
      ),
      anchorPosition: 'rightUp',
      'data-test-subj': 'configTourStep',
      ...commonProps,
    },
    {
      step: 5,
      title: i18n.translate('console.tour.filesStepTitle', {
        defaultMessage: 'Manage Console files',
      }),
      content: (
        <EuiText>
          {i18n.translate('console.tour.filesStepContent', {
            defaultMessage:
              'Easily export your Console requests to a file, or import ones you’ve saved previously.',
          })}
        </EuiText>
      ),
      anchorPosition: 'downRight',
      'data-test-subj': 'filesTourStep',
      ...commonProps,
    },
  ] as EuiStatelessTourSteps;
}
