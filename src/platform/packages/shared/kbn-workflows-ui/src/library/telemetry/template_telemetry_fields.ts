/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useQueryClient } from '@kbn/react-query';
import { CUSTOM_WORKFLOW_TEMPLATE_SLUG, UNRESOLVED_WORKFLOW_TEMPLATE_SLUG } from '@kbn/workflows';
import type { Template, TemplateBody } from '@kbn/workflows-library';
import type { LibraryTemplateOrigin, TemplateTelemetryFields } from './events';
import { CATALOG_QUERY_KEY } from '../hooks/use_catalog';

/**
 * Template fields for the events about a template. A catalog template's metadata comes from
 * the catalog. An imported file's slug and version are free text, so they're only sent when
 * the catalog lists them, with the rule the server applies to the template origin it stores.
 */
export const getTemplateTelemetryFields = (
  { metadata }: TemplateBody,
  templateOrigin: LibraryTemplateOrigin,
  catalog: Template[] | undefined
): TemplateTelemetryFields => {
  if (templateOrigin === 'catalog') {
    return {
      templateSlug: metadata.slug,
      templateVersion: metadata.version,
      templateOrigin,
      solutions: metadata.solutions ?? [],
    };
  }

  if (!catalog) {
    return { templateSlug: UNRESOLVED_WORKFLOW_TEMPLATE_SLUG, templateOrigin };
  }
  const catalogTemplate = catalog.find(({ slug }) => slug === metadata.slug);
  if (!catalogTemplate) {
    return { templateSlug: CUSTOM_WORKFLOW_TEMPLATE_SLUG, templateOrigin };
  }
  return {
    templateSlug: catalogTemplate.slug,
    ...(metadata.version === catalogTemplate.version
      ? { templateVersion: catalogTemplate.version }
      : {}),
    templateOrigin,
    solutions: catalogTemplate.solutions ?? [],
  };
};

/**
 * Template fields for `template`, resolved once per template. `installMode` is how the page
 * installs it: `custom` for an imported file, which is checked against the catalog the
 * browser already loaded, without a request (the catalog page, where the file is picked,
 * loads it).
 */
export const useTemplateTelemetryFields = (
  template: TemplateBody | undefined,
  installMode: 'catalog' | 'custom'
): TemplateTelemetryFields | undefined => {
  const queryClient = useQueryClient();
  return useMemo(() => {
    if (!template) {
      return undefined;
    }
    return installMode === 'custom'
      ? getTemplateTelemetryFields(
          template,
          'import',
          queryClient.getQueryData<Template[]>(CATALOG_QUERY_KEY)
        )
      : getTemplateTelemetryFields(template, 'catalog', undefined);
  }, [template, installMode, queryClient]);
};
