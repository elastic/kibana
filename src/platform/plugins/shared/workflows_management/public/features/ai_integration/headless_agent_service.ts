/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { catchError, filter, from, lastValueFrom, map, tap, toArray } from 'rxjs';
import zodToJsonSchema from 'zod-to-json-schema';
import type { HttpSetup } from '@kbn/core-http-browser';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import type { BrowserApiToolDefinition, EditorContext } from './browser_api_tools';

/**
 * Chat event types from agent builder
 */
enum ChatEventType {
  browserToolCall = 'browser_tool_call',
  messageChunk = 'message_chunk',
  messageComplete = 'message_complete',
  roundComplete = 'round_complete',
  reasoning = 'reasoning',
}

interface ChatEvent {
  type: string;
  data?: unknown;
}

interface BrowserToolCallEvent extends ChatEvent {
  type: typeof ChatEventType.browserToolCall;
  data: {
    tool_call_id: string;
    tool_id: string;
    params: Record<string, unknown>;
  };
}

interface MessageChunkEvent extends ChatEvent {
  type: typeof ChatEventType.messageChunk;
  data: {
    chunk: string;
  };
}

interface ReasoningEvent extends ChatEvent {
  type: typeof ChatEventType.reasoning;
  data: {
    reasoning: string;
  };
}

/**
 * Options for headless agent execution
 */
export interface HeadlessAgentOptions {
  /** The agent ID to use */
  agentId: string;
  /** The user's instruction/message */
  message: string;
  /** Attachments to include (e.g., workflow YAML) */
  attachments?: Array<{
    type: string;
    data: Record<string, unknown>;
  }>;
  /** Browser API tools available for the agent */
  browserApiTools: BrowserApiToolDefinition[];
  /** Editor context for executing browser tools */
  editorContext: EditorContext;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** Callback for status updates */
  onStatus?: (status: string) => void;
  /** Callback for reasoning updates */
  onReasoning?: (reasoning: string) => void;
  /** Callback for message chunks */
  onMessageChunk?: (chunk: string) => void;
}

/**
 * Result of headless agent execution
 */
export interface HeadlessAgentResult {
  success: boolean;
  message?: string;
  toolsExecuted: string[];
  error?: Error;
}

/**
 * Execute an agent request without the flyout UI.
 * Processes the SSE stream and executes browser API tools inline.
 */
export async function executeHeadlessAgent(
  http: HttpSetup,
  options: HeadlessAgentOptions
): Promise<HeadlessAgentResult> {
  const {
    agentId,
    message,
    attachments,
    browserApiTools,
    editorContext,
    signal,
    onStatus,
    onReasoning,
    onMessageChunk,
  } = options;

  const toolsExecuted: string[] = [];
  let fullMessage = '';

  // Build the browser API tools metadata for the request
  // API expects: id, description, schema (JSON Schema for parameters)
  // Convert Zod schemas to JSON Schema format
  const browserApiToolsMetadata = browserApiTools.map((tool) => ({
    id: tool.id,
    description: tool.description,
    schema: zodToJsonSchema(tool.schema, { $refStrategy: 'none' }),
  }));

  try {
    onStatus?.('Sending request to AI...');

    const requestBody = {
      agent_id: agentId,
      input: message,
      attachments,
      browser_api_tools: browserApiToolsMetadata,
    };

    // eslint-disable-next-line no-console
    console.log('[HeadlessAgent] Request body:', JSON.stringify(requestBody, null, 2));

    // Make the request to the agent API
    const response = await http.post('/api/agent_builder/converse/async', {
      signal,
      asResponse: true,
      rawResponse: true,
      headers: {
        'elastic-api-version': '2023-10-31',
      },
      body: JSON.stringify(requestBody),
    });

    // eslint-disable-next-line no-console
    console.log('[HeadlessAgent] Got response, processing SSE stream...');

    onStatus?.('Processing AI response...');

    // Collect all events for processing
    const allEvents: ChatEvent[] = [];

    // Process the SSE stream
    const events$ = from(Promise.resolve(response)).pipe(
      // @ts-expect-error SSE type issues
      httpResponseIntoObservable<ChatEvent>(),
      tap((event) => {
        // eslint-disable-next-line no-console
        console.log('[HeadlessAgent] Received event:', event.type, event);
        allEvents.push(event);

        // Handle different event types
        if (event.type === ChatEventType.browserToolCall) {
          const toolEvent = event as BrowserToolCallEvent;
          onStatus?.(`Executing tool: ${toolEvent.data.tool_id}...`);
        } else if (event.type === ChatEventType.reasoning) {
          const reasoningEvent = event as ReasoningEvent;
          onReasoning?.(reasoningEvent.data.reasoning);
        } else if (event.type === ChatEventType.messageChunk) {
          const chunkEvent = event as MessageChunkEvent;
          fullMessage += chunkEvent.data.chunk;
          onMessageChunk?.(chunkEvent.data.chunk);
        }
      }),
      filter((event) => event.type === ChatEventType.browserToolCall),
      map((event) => event as BrowserToolCallEvent),
      catchError((error) => {
        // eslint-disable-next-line no-console
        console.error('[HeadlessAgent] Stream error:', error);
        throw error;
      })
    );

    // Collect all browser tool call events and execute them
    const toolCallEvents = await lastValueFrom(events$.pipe(toArray()), { defaultValue: [] });

    // eslint-disable-next-line no-console
    console.log(
      '[HeadlessAgent] All events received:',
      allEvents.length,
      'Tool calls:',
      toolCallEvents.length
    );

    for (const toolEvent of toolCallEvents) {
      const toolId = toolEvent.data.tool_id;
      const params = toolEvent.data.params;

      // eslint-disable-next-line no-console
      console.log('[HeadlessAgent] Executing tool:', toolId, params);

      // Find the matching browser API tool
      const tool = browserApiTools.find((t) => t.id === toolId);
      if (tool) {
        onStatus?.(`Applying change: ${toolId}...`);

        // Log editor context state
        // eslint-disable-next-line no-console
        console.log('[HeadlessAgent] EditorContext state:', {
          hasEditor: !!editorContext.getEditor(),
          hasYamlDoc: !!editorContext.getYamlDocument(),
          hasProposedChangesManager: !!editorContext.getProposedChangesManager(),
        });

        try {
          // Execute the tool handler - it uses context from closure, not the passed param
          await tool.handler(params);
          toolsExecuted.push(toolId);
          // eslint-disable-next-line no-console
          console.log('[HeadlessAgent] Tool executed successfully:', toolId);
        } catch (toolError) {
          // eslint-disable-next-line no-console
          console.error(`[HeadlessAgent] Tool execution failed for ${toolId}:`, toolError);
        }
      } else {
        // eslint-disable-next-line no-console
        console.warn(`[HeadlessAgent] Tool not found: ${toolId}`);
      }
    }

    onStatus?.('Done');

    // eslint-disable-next-line no-console
    console.log('[HeadlessAgent] Completed. Tools executed:', toolsExecuted);

    return {
      success: true,
      message: fullMessage || 'Changes proposed successfully',
      toolsExecuted,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[HeadlessAgent] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      toolsExecuted,
    };
  }
}
