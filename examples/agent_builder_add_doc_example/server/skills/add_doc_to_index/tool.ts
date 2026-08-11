/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Readable } from 'stream';
import { isResponseError } from '@kbn/es-errors';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/logging';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import { z } from '@kbn/zod/v4';
import {
  ADD_DOC_TO_INDEX_TOOL_ID,
  MAX_UPLOAD_BYTES,
  UPLOADED_FILE_ATTACHMENT_TYPE,
} from '../../../common';

const BULK_BATCH_SIZE = 500;

const addDocToIndexSchema = z
  .object({
    attachment_id: z
      .string()
      .max(256)
      .describe('ID of the uploaded_file attachment whose content should be persisted'),
    index: z.string().min(1).max(1024).describe('Target Elasticsearch index name'),
    mapping: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        'Elasticsearch field mappings, e.g. { "timestamp": { "type": "date" }, "message": { "type": "text" } }. Provide either this or `mapping_attachment_id`.'
      ),
    mapping_attachment_id: z
      .string()
      .max(256)
      .optional()
      .describe(
        'ID of an uploaded_file attachment containing the ES field mappings as JSON. Use this when the user uploads a mapping file instead of pasting the mapping inline. Provide either this or `mapping`.'
      ),
  })
  .refine((data) => data.mapping != null || data.mapping_attachment_id != null, {
    message: 'Either `mapping` or `mapping_attachment_id` must be provided',
  });

/** Coerce a parsed JSON value into a flat array of documents. */
const toDocArray = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) {
    return value.filter((d): d is Record<string, unknown> => typeof d === 'object' && d !== null);
  }
  if (typeof value === 'object' && value !== null) {
    return [value as Record<string, unknown>];
  }
  return [];
};

interface JsonValidationResult {
  valid: boolean;
  docs?: Record<string, unknown>[];
  error?: string;
}

/**
 * Parse and shape-validate the uploaded bytes as JSON. Only structural
 * validation is performed here (the file must parse into an array of objects
 * or a single object); per-field content validation is left to ES at index
 * time. Replaces the deleted `validate_file.ts` helper, scoped to this skill.
 */
const validateJsonValue = (buffer: Buffer): JsonValidationResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(buffer.toString('utf8'));
  } catch (e) {
    return { valid: false, error: `File is not valid JSON: ${(e as Error).message}` };
  }
  const docs = toDocArray(parsed);
  if (docs.length === 0) {
    return {
      valid: false,
      error:
        'File contains no indexable documents (expected a JSON array of objects or a single JSON object)',
    };
  }
  return { valid: true, docs };
};

/** Collect a Readable into a Buffer, enforcing a hard byte cap. */
const collectReadable = async (stream: Readable, maxBytes: number): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of stream) {
    const buf: Buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    total += buf.length;
    if (total > maxBytes) {
      throw new Error(`Attachment exceeds the ${maxBytes} byte limit`);
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
};

/**
 * Inline tool exposed by the `add-doc-to-index` skill. Reads the raw bytes of
 * an `uploaded_file` attachment via `ctx.attachments.readContent` (server-side,
 * never inlined into the LLM context), creates the target index with the
 * supplied mapping, and bulk-indexes the documents.
 */
export const addDocToIndexTool = (): BuiltinSkillBoundedTool<typeof addDocToIndexSchema> => {
  return {
    id: ADD_DOC_TO_INDEX_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Persist the content of an uploaded_file attachment into a custom Elasticsearch index with a user-supplied mapping. The mapping may be provided inline (`mapping`) or as an uploaded_file attachment (`mapping_attachment_id`). File content is read server-side via readContent and never inlined into the agent context.',
    schema: addDocToIndexSchema,
    handler: async ({ attachment_id, index, mapping, mapping_attachment_id }, ctx) => {
      const logger = ctx.logger;

      try {
        const record = ctx.attachments.getAttachmentRecord(attachment_id);
        if (!record) {
          return errorResult(logger, `Attachment ${attachment_id} not found`);
        }
        if (record.type !== UPLOADED_FILE_ATTACHMENT_TYPE) {
          return errorResult(
            logger,
            `Attachment ${attachment_id} is of type ${record.type}, expected ${UPLOADED_FILE_ATTACHMENT_TYPE}`
          );
        }

        const stream = ctx.attachments.readContent(attachment_id);
        const buffer = await collectReadable(stream, MAX_UPLOAD_BYTES);

        const validation = validateJsonValue(buffer);
        if (!validation.valid || !validation.docs) {
          return errorResult(logger, validation.error ?? 'Invalid file');
        }
        const docs = validation.docs;

        // Resolve the mapping: either inline (`mapping`) or from an uploaded
        // mapping file (`mapping_attachment_id`), read server-side via
        // readContent so the raw mapping bytes stay out of the LLM context.
        let resolvedMapping: Record<string, unknown>;
        if (mapping_attachment_id) {
          const mapRecord = ctx.attachments.getAttachmentRecord(mapping_attachment_id);
          if (!mapRecord) {
            return errorResult(logger, `Mapping attachment ${mapping_attachment_id} not found`);
          }
          if (mapRecord.type !== UPLOADED_FILE_ATTACHMENT_TYPE) {
            return errorResult(
              logger,
              `Mapping attachment ${mapping_attachment_id} is of type ${mapRecord.type}, expected ${UPLOADED_FILE_ATTACHMENT_TYPE}`
            );
          }
          const mapStream = ctx.attachments.readContent(mapping_attachment_id);
          const mapBuffer = await collectReadable(mapStream, MAX_UPLOAD_BYTES);
          let parsedMapping: unknown;
          try {
            parsedMapping = JSON.parse(mapBuffer.toString('utf8'));
          } catch (e) {
            return errorResult(
              logger,
              `Mapping file is not valid JSON: ${(e as Error).message}`
            );
          }
          if (parsedMapping == null || typeof parsedMapping !== 'object' || Array.isArray(parsedMapping)) {
            return errorResult(
              logger,
              'Mapping file must be a JSON object of `field name -> ES field definition`'
            );
          }
          resolvedMapping = parsedMapping as Record<string, unknown>;
        } else if (mapping) {
          resolvedMapping = mapping;
        } else {
          return errorResult(logger, 'Either `mapping` or `mapping_attachment_id` must be provided');
        }

        const esClient = ctx.esClient.asCurrentUser;

        // Create the index with the supplied mapping; ignore if it already exists.
        try {
          await esClient.indices.create({
            index,
            mappings: { properties: resolvedMapping as Record<string, MappingProperty> },
          });
        } catch (e) {
          if (
            isResponseError(e) &&
            e.meta?.statusCode === 400 &&
            /already_exists/i.test(String(e.meta?.body))
          ) {
            logger.info(`Index ${index} already exists; proceeding with bulk index`);
          } else {
            throw e;
          }
        }

        // Bulk index in batches.
        let indexed = 0;
        for (let i = 0; i < docs.length; i += BULK_BATCH_SIZE) {
          const batch = docs.slice(i, i + BULK_BATCH_SIZE);
          const operations = batch.flatMap((doc) => [{ index: { _index: index } }, doc]);
          const result = await esClient.bulk({ operations, refresh: false });
          if (result.errors) {
            const firstError = result.items?.[0]?.index?.error;
            return errorResult(
              logger,
              `Bulk index failed on batch ${i / BULK_BATCH_SIZE}: ${JSON.stringify(firstError)}`
            );
          }
          indexed += batch.length;
        }

        logger.info(`add-doc-to-index: indexed ${indexed} docs into ${index}`);

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                index,
                indexed,
                docCount: docs.length,
              },
            },
          ],
        };
      } catch (error) {
        return errorResult(logger, error instanceof Error ? error.message : String(error));
      }
    },
  };
};

const errorResult = (logger: Logger, message: string) => {
  logger.error(message);
  return {
    results: [
      {
        tool_result_id: getToolResultId(),
        type: ToolResultType.error,
        data: { message },
      },
    ],
  };
};
