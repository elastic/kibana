# deepagent Knowledge Base: LLM / AI Integration Patterns

## Overview

LLM and AI integration patterns account for approximately 6% of deepagent's feedback (~30+ items across ~400 PRs). As the technical lead for the Agent Builder, he has deep firsthand experience with LLM provider quirks, tool orchestration, and the unique challenges of building reliable AI-powered features in production.

---

## Cross-Provider Compatibility

### Schema Compatibility

**PR #250386 - Gemini anyOf schema incompatibility (WARNING)**

Tool schemas must work across all supported LLM providers. Known limitations:

| Provider | Limitation |
|----------|-----------|
| Gemini (Google) | Does not support `anyOf` in JSON schemas |
| Claude (Anthropic) | Adds extra reasoning parameters to tool calls |
| All providers | Varying support for complex nested schemas |

**Rule:** When defining tool schemas, test them against all supported providers. Avoid advanced JSON Schema features that may not be universally supported.

```typescript
// BAD - uses anyOf, breaks Gemini
const schema = {
  type: 'object',
  properties: {
    input: {
      anyOf: [
        { type: 'string' },
        { type: 'number' },
      ],
    },
  },
};

// GOOD - uses simple types compatible with all providers
const schema = {
  type: 'object',
  properties: {
    input: { type: 'string' }, // Accept string, parse if needed
  },
};
```

### Non-Strict Schema Validation

**PR #226105 - Non-strict validation because Claude adds reasoning params (WARNING)**

Claude (Anthropic) sometimes adds extra parameters to tool calls that aren't in the schema (like internal "reasoning" or "thinking" parameters). Strict schema validation will reject these calls.

**Rule:** Use non-strict schema validation for tool call parameters. Validate that required fields are present and correctly typed, but don't reject unknown additional fields.

```typescript
// BAD - strict validation rejects Claude's extra params
const result = schema.validate(toolCallParams, { strict: true });
// Fails when Claude adds { reasoning: "I need to search for..." }

// GOOD - non-strict allows extra fields
const result = schema.validate(toolCallParams, { allowUnknown: true });
```

---

## Claude-Specific Patterns

### Hallucinated Tool Calls from History

**PR #237427 - Claude hallucinating tool calls from history (WARNING)**

Claude has a known behavior where it may re-invoke tools from conversation history, even if those tools are no longer available in the current context.

**Symptoms:**
- Claude calls a tool that was removed from the available tools list
- Claude repeats a tool call that was already completed earlier in the conversation
- Claude calls a tool with parameters from a previous conversation turn

**Mitigations:**
- Validate all tool calls against the current available tools list
- Return a clear error message when a tool call references an unavailable tool
- Consider truncating conversation history to limit the context window
- Explicitly state in the system prompt which tools are available

### Claude Ignoring Tool Availability

**PR #239421 - Claude stubborn about tool calling (WARNING)**

Claude may try to call tools that aren't in the current schema, especially if the conversation context mentions tools or if the system prompt references capabilities.

**Mitigations:**
- Keep the system prompt consistent with the available tools
- Don't mention tools in the system prompt that aren't currently available
- Handle unknown tool call errors gracefully
- Consider adding explicit instructions: "Only use the tools listed above"

---

## System Prompt Design

### Centralized Assembly

**PR #248788 - System prompt centralization (BLOCKER)**

System prompts must be assembled in a single, well-defined module. See `architecture.md` for the full rule.

### Context Caching Considerations

**PR #249386 - Full date in system prompt breaks context caching (WARNING)**

LLM providers cache system prompts to improve performance and reduce costs. Including dynamic content (like full timestamps) in the system prompt invalidates the cache on every request.

```typescript
// BAD - cache invalidated every second
const systemPrompt = `You are a helpful assistant. Current time: ${new Date().toISOString()}`;

// GOOD - stable system prompt, pass time in user message if needed
const systemPrompt = 'You are a helpful assistant.';
const userMessage = `Current date: ${getCurrentDate()}. ${userQuery}`;

// ACCEPTABLE - date only (changes daily, not every second)
const systemPrompt = `You are a helpful assistant. Today is ${getCurrentDateOnly()}.`;
```

**Rule:** Minimize dynamic content in system prompts. If temporal context is needed, prefer passing it in the user message or using a coarse granularity (date only, not full timestamp).

---

## Tool Design

### Dual-Purpose Descriptions

**PR #237117 - Tool descriptions serve dual user/LLM purpose (WARNING)**

Tool descriptions in the Agent Builder are displayed in two contexts:
1. **User-facing**: Shown in the UI as help text for the user
2. **LLM-facing**: Included in the prompt as tool descriptions for the LLM

The description must be clear and useful for both audiences:

```typescript
// BAD - too vague for LLM, too technical for user
const tool = {
  name: 'search',
  description: 'Executes a search',
};

// BAD - good for LLM but bad for user
const tool = {
  name: 'search',
  description: 'Use this tool when the user asks to find documents. Pass the query as a string. Returns JSON array of matching documents with _id, _source, and _score fields.',
};

// GOOD - works for both
const tool = {
  name: 'search',
  description: 'Search for documents in Elasticsearch. Provide a natural language query to find relevant documents. Returns matching documents with their relevance scores.',
};
```

### Tool Name Safety

**PR #240893 - Tool prefix spoofing prevention (BLOCKER)**

User-defined tools must not use reserved prefixes. See `security_review.md` for the full rule.

### Tool Schema Design

**Best practices:**
- Keep schemas simple and flat when possible
- Use `string` type with clear descriptions rather than complex types
- Test schemas against all supported providers
- Document expected input format in the tool description
- Use non-strict validation for tool call parameters

---

## Structured Output

### Prefer Structured Output Over Text Parsing

**PR #243474 - Structured output over text parsing (WARNING)**

When you need the LLM to return data in a specific format, use structured output (`withStructuredOutput`) rather than prompting for a format and parsing the text response.

```typescript
// BAD - text parsing is fragile
const response = await llm.invoke('List the entities as JSON: ...');
const entities = JSON.parse(response.content); // May fail!

// GOOD - structured output with schema
const structuredLlm = llm.withStructuredOutput({
  type: 'object',
  properties: {
    entities: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['entities'],
});
const result = await structuredLlm.invoke('List the entities in the following text: ...');
// result.entities is guaranteed to be a string array
```

**Benefits:**
- Reliable parsing (the provider enforces the schema)
- Works especially well with smaller models that may not follow text format instructions
- Type-safe results in TypeScript
- No custom parsing logic to maintain

### Naming Convention

**PR #243474 - withStructuredOutput naming for smaller models (WARNING)**

When using structured output with smaller/less capable models, be explicit about the output format in the prompt. Larger models understand schema constraints implicitly; smaller models may need additional guidance.

---

## Human-in-the-Loop (HITL) Patterns

For tool calls that have side effects (creating documents, sending emails, executing code), implement human-in-the-loop confirmation:

```typescript
// Tool definition with HITL
const tool = {
  name: 'create_document',
  description: 'Creates a new document in Elasticsearch',
  requiresConfirmation: true, // Flag for HITL
  handler: async (input, context) => {
    if (context.confirmationRequired && !context.confirmed) {
      return {
        type: 'confirmation_required',
        message: `Create document "${input.title}" in index "${input.index}"?`,
        details: input,
      };
    }
    // Proceed with creation
    return await context.esClient.index({ ... });
  },
};
```

---

## Error Handling for LLM Calls

### Graceful Degradation

LLM calls can fail for many reasons (rate limits, timeouts, content filters, provider outages). Handle each case explicitly:

```typescript
try {
  const response = await llm.invoke(messages);
  return processResponse(response);
} catch (error) {
  if (isRateLimitError(error)) {
    // Retry with backoff
    return await retryWithBackoff(() => llm.invoke(messages));
  }
  if (isContentFilterError(error)) {
    // Return user-friendly message
    return { error: 'The request was filtered by content safety. Please rephrase.' };
  }
  if (isTimeoutError(error)) {
    // Return timeout message
    return { error: 'The request timed out. Please try again.' };
  }
  // Unknown error - log and return generic message
  logger.error('LLM call failed', error);
  return { error: 'An unexpected error occurred.' };
}
```

### Tool Call Error Handling

When a tool call fails, return a structured error to the LLM so it can decide what to do:

```typescript
try {
  return await tool.handler(params, context);
} catch (error) {
  return {
    error: true,
    message: `Tool "${tool.name}" failed: ${error.message}`,
    // Include enough context for the LLM to decide next steps
  };
}
```

---

## Common Anti-patterns

### 1. anyOf in Tool Schemas
Already covered. Not supported by Gemini.

### 2. Strict Schema Validation for Tool Calls
Already covered. Claude adds extra params.

### 3. Full Timestamps in System Prompts
Already covered. Breaks context caching.

### 4. Text Parsing Instead of Structured Output
Already covered. Use `withStructuredOutput`.

### 5. Generic Tool Descriptions
Already covered. Descriptions must be useful for both users and LLMs.

### 6. Not Handling Hallucinated Tool Calls
Already covered. Validate against current tool list.

### 7. Scattered System Prompt Fragments
Already covered. Centralize assembly.

### 8. Assuming Provider Consistency
Different LLM providers behave differently. Never assume that behavior observed with one provider will be the same with another.

---

## Provider-Specific Notes

### Anthropic (Claude)
- May hallucinate tool calls from conversation history
- Adds reasoning/thinking parameters to tool calls
- Can be "stubborn" about tool usage (ignores available tools list)
- Strong at following complex instructions but may over-interpret
- Context caching is sensitive to system prompt changes

### Google (Gemini)
- Does not support `anyOf` in JSON schemas
- Different structured output behavior than Claude
- May require different prompt patterns for optimal results

### OpenAI (GPT)
- Generally good schema support
- Different token limits and pricing
- Function calling vs tool calling API differences

---

## Summary of Severity

| Issue | Severity |
|-------|----------|
| Scattered system prompt fragments | BLOCKER |
| Tool prefix spoofing | BLOCKER |
| anyOf in tool schemas (Gemini compat) | WARNING |
| Strict schema validation (Claude compat) | WARNING |
| Full timestamp in system prompt | WARNING |
| Claude hallucinated tool calls | WARNING |
| Claude ignoring tool availability | WARNING |
| Text parsing instead of structured output | WARNING |
| Generic tool descriptions | WARNING |
| Not testing schemas across providers | WARNING |
