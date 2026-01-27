---
navigation_title: "Preconfigured AI Connectors"
applies_to:
    stack: ga 9.0
    serverless: ga
---

# Preconfigured AI Connectors

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

The Preconfigured AI Connectors use third party service providers for {{infer}}. See [the elastic inference service page](https://www.elastic.co/docs/explore-analyze/elastic-inference/eis) for details.

## Data protection

Customer projects or deployments hosted in any cloud service provider or region have access to the Preconfigured AI Connectors in the AWS US region `us-east-1`.
All data is encrypted in transit. The LLMs are configured for zero data retention: none of the prompts or outputs are stored by the service provider.

Only request metadata is logged in AWS CloudWatch.
No information related to prompts is retained.
Logged metadata includes the timestamp, model used, region, and request status.

Read more at our [AI Data FAQs](https://www.elastic.co/trust/ai-data-faq) to learn about our data practices for AI related features.

## Pricing

The Preconfigured AI Connectors incur a cost per million tokens for input and output tokens. Refer to the Elastic Cloud [pricing pages](https://www.elastic.co/pricing) for details.
