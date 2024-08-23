/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiStatelessTourSteps, EuiLink, EuiText } from '@elastic/eui';

const commonProps = {
  stepsTotal: 5,
  maxWidth: 400,
};

export function getTourSteps(docLinks) {
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
              'This is our UI for interacting with Elasticsearch clusters using QueryDSL. Easily run queries, manage settings, and view search results.',
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
            defaultMessage="Enter a request in this input pane, and the response will be shown in the neighboring output pane. For more details, visit {queryDslDocs}."
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
      offset: 15,
      ...commonProps,
    },
    {
      step: 4,
      title: i18n.translate('console.tour.configStepTitle', {
        defaultMessage: 'Tailor your toolbox',
      }),
      content: (
        <EuiText>
          {i18n.translate('console.tour.configStepContent', {
            defaultMessage:
              'Fine-tune your Console’s settings and manage variables to personalize your workflow to suit your work style.',
          })}
        </EuiText>
      ),
      anchorPosition: 'rightUp',
      'data-test-subj': 'configTourStep',
      offset: 15,
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
              'Easily export your console input requests to a file, or import those you’ve saved previously.',
          })}
        </EuiText>
      ),
      anchorPosition: 'downRight',
      'data-test-subj': 'filesTourStep',
      ...commonProps,
    },
  ] as EuiStatelessTourSteps;
}
