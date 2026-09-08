---
navigation_title: AI Connector
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/bedrock-action-type.html
applies_to:
  stack: preview 9.2
  serverless: preview
---

# AI connector

The AI Connector uses the [Inference API](docs-content://explore-analyze/elastic-inference/inference-api.md) to connect to third-party Large Language Model (LLM) services to enable AI-powered {{kib}} features such as AI Assistant. It can connect with LLM services including Amazon Bedrock, Azure, Google Gemini, and OpenAI. It can also connect with models you've enabled in Elastic Inference Service (EIS). 

## Requirements

* A working [LLM connector](docs-content://explore-analyze/ai-features/llm-guides/llm-connectors.md).
* {{stack}} users: An [Enterprise](https://www.elastic.co/pricing) subscription.
* Serverless users: a project with the [Security Analytics Complete](docs-content://deploy-manage/deploy/elastic-cloud/project-settings.md) feature tier.
* The **Actions and Connectors : All** [privilege](docs-content://deploy-manage/users-roles/cluster-or-deployment-auth/kibana-privileges.md).


## Set up an AI connector

1. Use the [global search field](docs-content://explore-analyze/find-and-organize/find-apps-and-objects.md) to find the **Connectors** page.
2. Click **+ Create connector**. Select **AI Connector**.
3. Name your connector and select which LLM service to use. 
4. In the **Settings** section, specify which model to use for this connector. You may need to refer to your selected LLM service's list of models. Model names and other model parameters must be exact.
5. In the **Authentication** section, provide the necessary credentials. All supported LLM services other than EIS require authentication. For information about how to generate authentication information for each one, refer to [Enable LLM access](docs-content://explore-analyze/ai-features/llm-guides/llm-connectors.md).
6. Expand the **Additional settings** menu. Select a **Task type** that matches your selected model's purpose. Refer to the model information for your selected model to identify which task types it supports.  
7. (Optional) In the **Additional settings** section, some LLM services allow you to set a **Context window length**. Enter a value to specify how many tokens to send to the model per request, or leave it blank to use the model's default.
8. Finally, click **Save & test** to verify that the connector is set up. 

You can now select your newly configured connector for all {{kib}} features that rely on LLM connectors. 
