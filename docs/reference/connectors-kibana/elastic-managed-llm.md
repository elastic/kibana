---
navigation_title: "Elastic Managed LLMs"
applies_to:
    stack: ga 9.0
    serverless: ga
---

# Elastic Managed LLMs

Elastic provides built-in LLMs through AI connectors vetted for GenAI product features across our platform.
Currently, the following built-in LLMs are available:

* [`anthropic-claude-4.5-sonnet`](#claude-45)
* [`anthropic-claude-3.7-sonnet`](#claude-37)

## `anthropic-claude-4.5-sonnet` [claude-45]
```{applies_to}
stack: ga 9.3
serverless: ga
```

A high-performance, general-purpose language model suitable for the widest range of use cases.
Model details are available in the [model card](https://assets.anthropic.com/m/12f214efcc2f457a/original/Claude-Sonnet-4-5-System-Card.pdf).

## `anthropic-claude-3.7-sonnet` [claude-37]
```{applies_to}
stack: ga 9.0
serverless: ga
```

`anthropic-claude-3.7-sonnet` is the default LLM used by the AI connector.

::::{note}
* The default LLM may change in the future based on evaluations of performance, security, and accuracy.
* This LLM was called **Elastic Managed LLM** before 9.3.
::::

Details of the currently used model are available in the [model card](https://assets.anthropic.com/m/785e231869ea8b3b/original/claude-3-7-sonnet-system-card.pdf).

## Prerequisites

* Requires the `manage_inference` [cluster privilege](https://www.elastic.co/docs/reference/elasticsearch/security-privileges#privileges-list-cluster) (the built-in `inference_admin` role grants this privilege)

## Region and hosting

The Elastic Managed LLMs use a third party service provider for inference. Currently, this is AWS Bedrock in AWS US regions, beginning with `us-east-1`. Additional providers may be added in future.

## Data protection

Customer projects or deployments hosted in any cloud service provider or region have access to the Elastic Managed LLMs in the AWS US region `us-east-1`.
All data is encrypted in transit. The LLMs are configured for zero data retention: none of the prompts or outputs are stored by the service provider.

Only request metadata is logged in AWS CloudWatch.
No information related to prompts is retained.
Logged metadata includes the timestamp, model used, region, and request status.

Read more at our [AI Data FAQs](https://www.elastic.co/trust/ai-data-faq) to learn about our data practices for AI related features.

## Pricing

The Elastic Managed LLMs incur a cost per million tokens for input and output tokens. Refer to the Elastic Cloud [pricing pages](https://www.elastic.co/pricing) for details.
