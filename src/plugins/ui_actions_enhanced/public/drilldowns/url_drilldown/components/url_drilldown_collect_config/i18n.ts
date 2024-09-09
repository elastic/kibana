/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const txtUrlTemplatePlaceholder = i18n.translate(
  'uiActionsEnhanced.drilldowns.urlDrilldownCollectConfig.urlTemplatePlaceholderText',
  {
    defaultMessage: 'Example: {exampleUrl}',
    values: {
      exampleUrl: 'https://www.my-url.com/?{{event.key}}={{event.value}}',
    },
  }
);

export const txtUrlPreviewHelpText = i18n.translate(
  'uiActionsEnhanced.drilldowns.urlDrilldownCollectConfig.urlPreviewHelpText',
  {
    defaultMessage: `Please note that in preview '{{event.*}}' variables are substituted with dummy values.`,
  }
);

export const txtUrlTemplateLabel = i18n.translate(
  'uiActionsEnhanced.drilldowns.urlDrilldownCollectConfig.urlTemplateLabel',
  {
    defaultMessage: 'Enter URL',
  }
);

export const txtUrlTemplateSyntaxHelpLinkText = i18n.translate(
  'uiActionsEnhanced.drilldowns.urlDrilldownCollectConfig.urlTemplateSyntaxHelpLinkText',
  {
    defaultMessage: 'Syntax help',
  }
);

export const txtUrlTemplatePreviewLabel = i18n.translate(
  'uiActionsEnhanced.drilldowns.urlDrilldownCollectConfig.urlPreviewLabel',
  {
    defaultMessage: 'URL preview:',
  }
);

export const txtUrlTemplatePreviewLinkText = i18n.translate(
  'uiActionsEnhanced.drilldowns.urlDrilldownCollectConfig.urlPreviewLinkText',
  {
    defaultMessage: 'Preview',
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
