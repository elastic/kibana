# [Alerting V2] [Agent] Implement resolve_rule_source_index tool for v2 rule authoring

## Summary

`resolve_rule_source_index` is the first tool called in the rule authoring skill when the
user has not provided an explicit index. It resolves the user's natural language description
of their data ("my checkout service metrics") to a confirmed source index, stream, or data
view, which is then passed to `get_rule_context` to fetch field caps and schema context.

This tool is a prerequisite for `get_rule_context` in any flow where the target index is
not already known.

## Background

The rule authoring skill begins with intent — "create a rule against my checkout service
metrics." Before any field caps, sampling, or rule drafting can happen, the agent must
resolve that phrase to a concrete index target. This resolution must:

- Search across Streams streams, Kibana data views, and raw index patterns
- Use Streams pre-computed knowledge indicators (entity labels, technology labels, schema type)
  as additional matching signals when available — a stream with a stored entity label
  `checkout` is a stronger match than one whose name alone partially matches
- Stop and confirm with the user rather than guess when the match is ambiguous

The tool deliberately does not proceed past candidate selection — confirmation is always
required before `get_rule_context` is called, ensuring all downstream context gathering
and rule drafting is anchored to the correct data.

**Reference implementations:**
- `streamsClient.listStreams()` — `x-pack/platform/plugins/shared/streams/server/`
- `createSearchKnowledgeIndicatorsTool` — `x-pack/platform/plugins/shared/streams/server/agent_builder/tools/`
- Kibana data views API (user-scoped)

## Behavior

1. Query available Streams streams and Kibana data views in parallel (user-scoped clients)
2. For Streams candidates, include stored knowledge indicator labels (entity names, technology
   tags, schema type) as additional matching context alongside the stream name
3. Pass the candidate list and user intent to the LLM to rank and select matches
4. Return candidates to the agent with the following disambiguation behavior:

| Scenario | Behavior |
|----------|----------|
| Exactly one strong match | Return it; agent presents it to the user and asks for confirmation before calling `get_rule_context` |
| Multiple plausible matches | Return all; agent presents them to the user and asks which one they mean |
| No match found | Return empty; agent asks the user to clarify or provide the index name directly |

## Output shape

```ts
{
  candidates: Array<{
    name: string;                    // index pattern, stream name, or data view title
    type: 'stream' | 'data_view' | 'index_pattern';
    confidence: 'high' | 'medium' | 'low';
    knowledgeIndicatorLabels?: string[];  // entity/technology/schema labels derived from
                                          // Streams knowledge indicators; only present for
                                          // Streams-managed streams
  }>;
}
```

## Acceptance criteria

- [ ] Tool is added to the tool list of the rule authoring skill (#261378)
- [ ] Tool queries available Streams streams and Kibana data views in parallel using user-scoped clients
- [ ] For Streams candidates, stored knowledge indicator labels are included as matching signals
- [ ] Tool returns a ranked candidate list with type and confidence
- [ ] Tool never auto-selects a candidate — the agent always presents results to the user for confirmation
- [ ] All data retrieval uses user-scoped clients (no internal user bypass)

## Parent

- #261378 (rule authoring skill meta)
