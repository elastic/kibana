/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { EuiStatelessTourSteps } from '@elastic/eui';

const commonProps = {
  stepsTotal: 5,
  maxWidth: 400,
};

export function getTourSteps() {
  return [
    {
      step: 1,
      title: i18n.translate('console.tour.shellStepTitle', {
        defaultMessage: 'Welcome to the Console',
      }),
      content: i18n.translate('console.tour.shellStepContent', {
        defaultMessage:
          'This is our UI for interacting with Elasticsearch clusters using QueryDSL. Easily run queries, manage settings, and view search results.',
      }),
      anchorPosition: 'upLeft',
      'data-test-subj': 'shellTourStep',
      ...commonProps,
    },
    {
      step: 2,
      title: i18n.translate('console.tour.editorStepTitle', {
        defaultMessage: 'Get started querying',
      }),
      content: i18n.translate('console.tour.editorStepContent', {
        defaultMessage:
          'Enter a request in this input pane, and the response will be shown in the neighboring output pane. For more details, visit our QueryDSL documentation.',
      }),
      anchorPosition: 'leftUp',
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
      content: i18n.translate('console.tour.historyStepContent', {
        defaultMessage:
          'Enter a request in this input pane, and the response will be shown in the neighboring output pane. For more details, visit our QueryDSL documentation.',
      }),
      anchorPosition: 'leftUp',
      'data-test-subj': 'historyTourStep',
      offset: 15,
      ...commonProps,
    },
    {
      step: 4,
      title: i18n.translate('console.tour.configStepTitle', {
        defaultMessage: 'Tailor your toolbox',
      }),
      content: i18n.translate('console.tour.configStepContent', {
        defaultMessage:
          'The history panel keeps track of your past queries, making it easy to review and rerun them. ',
      }),
      anchorPosition: 'leftUp',
      'data-test-subj': 'configTourStep',
      offset: 15,
      ...commonProps,
    },
    {
      step: 5,
      title: i18n.translate('console.tour.filesStepTitle', {
        defaultMessage: 'Manage Console files',
      }),
      content: i18n.translate('console.tour.filesStepContent', {
        defaultMessage:
          'Easily export your console input requests to a file, or import those you’ve saved previously.',
      }),
      anchorPosition: 'upRight',
      'data-test-subj': 'filesTourStep',
      ...commonProps,
    },
  ] as EuiStatelessTourSteps;
}
