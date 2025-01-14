/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const txtUrlTemplateLabel = i18n.translate(
  'uiActionsEnhanced.drilldowns.urlDrilldownCollectConfig.urlTemplateLabel',
  {
    defaultMessage: 'Enter URL',
  }
);

export const txtEmptyErrorMessage = i18n.translate(
  'uiActionsEnhanced.drilldowns.urlDrilldownCollectConfig.urlTemplateEmptyErrorMessage',
  {
    defaultMessage: 'URL template is required.',
  }
);

export const txtInvalidFormatErrorMessage = ({
  error,
  example,
}: {
  error: string;
  example: string;
}) =>
  i18n.translate(
    'uiActionsEnhanced.drilldowns.urlDrilldownCollectConfig.urlTemplateInvalidFormatErrorMessage',
    {
      defaultMessage: '{error} Example: {example}',
      values: {
        error,
        example,
      },
    }
  );

export const txtUrlTemplateSyntaxTestingHelpText = i18n.translate(
  'uiActionsEnhanced.drilldowns.urlDrilldownCollectConfig.urlTemplateSyntaxTestingHelpText',
  {
    defaultMessage:
      'To validate and test the URL template, save the configuration and use this drilldown from the panel.',
  }
);

export const txtUrlTemplateSyntaxHelpLinkText = i18n.translate(
  'uiActionsEnhanced.drilldowns.urlDrilldownCollectConfig.urlTemplateSyntaxHelpLinkText',
  {
    defaultMessage: 'Syntax help',
  }
);

export const txtUrlTemplateOpenInNewTab = i18n.translate(
  'uiActionsEnhanced.drilldowns.urlDrilldownCollectConfig.openInNewTabLabel',
  {
    defaultMessage: 'Open URL in new tab',
  }
);

export const txtUrlTemplateAdditionalOptions = i18n.translate(
  'uiActionsEnhanced.drilldowns.urlDrilldownCollectConfig.additionalOptions',
  {
    defaultMessage: 'Additional options',
  }
);

export const txtUrlTemplateEncodeUrl = i18n.translate(
  'uiActionsEnhanced.drilldowns.urlDrilldownCollectConfig.encodeUrl',
  {
    defaultMessage: 'Encode URL',
  }
);

export const txtUrlTemplateEncodeDescription = i18n.translate(
  'uiActionsEnhanced.drilldowns.urlDrilldownCollectConfig.encodeDescription',
  {
    defaultMessage: 'If enabled, URL will be escaped using percent encoding',
  }
);
