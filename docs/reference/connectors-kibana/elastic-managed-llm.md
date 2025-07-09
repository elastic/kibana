---
navigation_title: "Elastic Managed LLM"
---

# Elastic Managed LLM

Elastic provides a default LLM vetted for GenAI product features across our platform.
Details of the currently used model are available in the [model card](https://raw.githubusercontent.com/elastic/kibana/refs/heads/main/docs/reference/resources/Elastic_Managed_LLM_model_card.pdf).

::::{note}
The default LLM may change in the future based on evaluations of performance, security, and accuracy.
::::

## Region and hosting

The Elastic Managed LLM is currently proxying to AWS Bedrock in AWS US regions, beginning with `us-east-1`. 

## Data protection

Customer projects or deployments hosted in any cloud service provider or region have access to the Elastic Managed LLM in the AWS US region `us-east-1`.
All data is encrypted in transit. The LLM is configured for zero data retention: none of the prompts or outputs are stored by the model.

Only request metadata is logged in AWS CloudWatch.
No information related to prompts is retained.
Logged metadata includes the timestamp, model used, region, and request status.

Read more at our [AI Data FAQs](https://www.elastic.co/trust/ai-data-faq) to learn about our data practices for AI related features. 

