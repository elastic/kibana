---
navigation_title: "Elastic Managed LLMs"
applies_to:
    stack: ga 9.0
    serverless: ga
---

# Elastic Managed LLMs

Elastic provides built-in LLMs through AI connectors vetted for GenAI product features across our platform. You can use these models through the [Elastic {{infer-cap}} Service (EIS)](docs-content://explore-analyze/elastic-inference/eis.md).

## Prerequisites

* Requires the `manage_inference` [cluster privilege](https://www.elastic.co/docs/reference/elasticsearch/security-privileges#privileges-list-cluster) (the built-in `inference_admin` role grants this privilege)
* {applies_to}`self: ga 9.3+` Elastic Managed LLMs are available through [EIS with Cloud-Connect](docs-content://explore-analyze/elastic-inference/connect-self-managed-cluster-to-eis.md)

## Region and hosting

The Preconfigured AI Connectors use third party service providers for {{infer}}. Refer to [the Elastic {{infer-cap}} Service page](https://www.elastic.co/docs/explore-analyze/elastic-inference/eis) for details.

## Data protection

Customer projects or deployments hosted in any cloud service provider or region have access to Elastic Managed LLMs in the AWS US region `us-east-1`.
All data is encrypted in transit. The LLMs are configured for zero data retention: none of the prompts or outputs are stored by the service provider.

Only request metadata is logged in AWS CloudWatch.
No information related to prompts is retained.
Logged metadata includes the timestamp, model used, region, and request status.

Read more at our [AI Data FAQs](https://www.elastic.co/trust/ai-data-faq) to learn about our data practices for AI related features.

## Pricing

Elastic Managed LLMs incur a cost per million tokens for input and output tokens. Refer to the Elastic Cloud [pricing pages](https://www.elastic.co/pricing) for details.

## Available models

Elastic Managed LLMs are available exclusively through the Elastic {{infer-cap}} Service.
You can find the [list of supported models](docs-content://explore-analyze/elastic-inference/eis.md#supported-models) on the EIS documentation page.
