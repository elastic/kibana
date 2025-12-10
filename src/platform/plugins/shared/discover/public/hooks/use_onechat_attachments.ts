/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useCallback, useMemo } from 'react';
import { AttachmentType } from '@kbn/onechat-common/attachments';
import type { AttachmentInput } from '@kbn/onechat-common/attachments';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { DiscoverServices } from '../build_services';

interface DiscoverViewContext {
  dataView: DataView | undefined;
  columns: string[];
  documents: DataTableRecord[];
  query: string | undefined;
}

/**
 * Builds a text description of the current Discover view for the AI assistant
 */
export const buildDiscoverContextText = (context: DiscoverViewContext): string => {
  const parts: string[] = [];

  if (context.dataView) {
    parts.push(`## Data View: ${context.dataView.getName()}`);
    parts.push(`Index pattern: ${context.dataView.getIndexPattern()}`);

    // Add time field if available
    const timeField = context.dataView.timeFieldName;
    if (timeField) {
      parts.push(`Time field: ${timeField}`);
    }
  }

  // Add selected columns
  if (context.columns.length > 0 && !context.columns.includes('_source')) {
    parts.push(`\n## Selected Columns`);
    parts.push(context.columns.join(', '));
  }

  // Add fields info
  if (context.dataView) {
    const fields = context.dataView.fields
      .filter((f) => !f.name.startsWith('_')) // Exclude system fields
      .slice(0, 20) // Limit to first 20 fields
      .map((f) => `- ${f.name} (${f.type})`);

    if (fields.length > 0) {
      parts.push(`\n## Available Fields (first 20)`);
      parts.push(fields.join('\n'));
    }
  }

  // Add sample documents
  if (context.documents.length > 0) {
    parts.push(`\n## Sample Documents (${Math.min(context.documents.length, 5)} of ${context.documents.length})`);
    const sampleDocs = context.documents.slice(0, 5).map((doc, index) => {
      // Get only the selected columns or first few fields if no columns selected
      const fieldsToShow = context.columns.length > 0 && !context.columns.includes('_source')
        ? context.columns
        : Object.keys(doc.flattened).filter(k => !k.startsWith('_')).slice(0, 10);

      const docData = fieldsToShow.reduce((acc, field) => {
        if (doc.flattened[field] !== undefined) {
          acc[field] = doc.flattened[field];
        }
        return acc;
      }, {} as Record<string, unknown>);

      return `### Document ${index + 1}\n\`\`\`json\n${JSON.stringify(docData, null, 2)}\n\`\`\``;
    });
    parts.push(sampleDocs.join('\n\n'));
  }

  // Add current query if any
  if (context.query) {
    parts.push(`\n## Current Query`);
    parts.push(`\`\`\`\n${context.query}\n\`\`\``);
  }

  return parts.join('\n');
};

/**
 * Creates attachments for onechat based on the current Discover view context
 */
export const createDiscoverAttachments = (
  context: DiscoverViewContext
): AttachmentInput[] => {
  const attachments: AttachmentInput[] = [];

  // Screen context attachment (hidden from user)
  attachments.push({
    id: 'discover-screen-context',
    type: AttachmentType.screenContext,
    data: {
      app: 'discover',
      url: window.location.href,
      description: 'User is exploring data in Discover',
    },
    hidden: true,
  });

  // Text attachment with Discover view information
  const textContent = buildDiscoverContextText(context);
  if (textContent) {
    attachments.push({
      id: 'discover-view-context',
      type: AttachmentType.text,
      data: {
        content: textContent,
      },
    });
  }

  return attachments;
};

/**
 * Hook that provides a function to update onechat attachments based on current Discover state
 * Use this in components that have access to the Discover state container
 */
export const useUpdateOnechatAttachments = (
  services: DiscoverServices,
  context: DiscoverViewContext
) => {
  const { onechat } = services;

  const attachments = useMemo(() => createDiscoverAttachments(context), [context]);

  useEffect(() => {
    if (!onechat?.setConversationFlyoutActiveConfig) {
      return;
    }

    onechat.setConversationFlyoutActiveConfig({
      sessionTag: 'discover',
      newConversation: false,
      attachments,
    });
  }, [onechat, attachments]);
};

/**
 * Hook that provides a function to get current attachments based on Discover state
 * This is useful for opening a conversation with current context programmatically
 */
export const useDiscoverAttachments = () => {
  const getAttachments = useCallback(
    (context: DiscoverViewContext): AttachmentInput[] => {
      return createDiscoverAttachments(context);
    },
    []
  );

  return { getAttachments, createDiscoverAttachments };
};
