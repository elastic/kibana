# Adaptive Thinking Budget (Dynamic Token Allocation)

## Idea Description
This experiment aims to make the agent's reasoning process adaptive by having it dynamically allocate a "thinking budget" (a token limit or maximum number of reasoning steps) for itself based on an initial analysis of the query.

The core principle is:

- Simple Query: Fast, shallow reasoning (low token budget, fewer steps).
- Complex Query: Deeper, multi-step reasoning (higher token budget, more steps).

This could be enforced by adding an explicit instruction at the beginning of the prompt: "First, classify the query complexity (Simple/Medium/Complex) and state your maximum token budget for this turn."

To estimate the complexity, we can use the `index_explorer` tool. We can classify the query complexity based on how many sources the agent needs to use to answer the query (multi-source) or how many hops (multi-hop).

## Aim
To optimize latency and cost by preventing simple queries from undergoing complex, resource-intensive reasoning and ensuring that complex queries receive the necessary resources for a correct, grounded answer.

## Targeted Metrics
- Success Metrics: Latency (for simple queries), Cost per Turn
- Guardrail Metrics: Correctness (for complex queries, must not regress)

## Evaluation Setup
- Query Classification: Implement a preliminary step in the agent's reasoning to classify the query complexity (e.g., use a separate, lightweight LLM call or a prompt instruction for the main agent).
- Budget Enforcement: Use the complexity classification to set the maximum token limit or step count for the main agent's reasoning loop.
- Data Segmentation: Analyze results segmented by "Simple" vs. "Complex" queries to validate the hypothesis.

| Complexity | Predicted Response Time | Allowed ReAct Steps |
| ---------- | ----------------------- | ------------------- |
| Simple     | Low (<5s)               | 1-3                 |
| Medium     | Moderate (5-15s)        | 4-6                 |
| Complex    | High (>15s)             | 7-10+               |

## References:
- `tale_summary.md` is a summary of a paper that presents TALE-EP, a similar approach based on prompting.