<!-- To regenerate, run: node scripts/generate workflow-step-docs -->

# AI workflow steps

Step types in the **AI** category (`ai`).

## AI Classify

The ai.classify step categorizes input data into predefined categories using an AI connector. The classification result can be referenced in later steps using template syntax.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `allowMultipleCategories` | boolean | Optional |
| `categories` | array | Yes |
| `fallbackCategory` | string | Optional |
| `includeRationale` | boolean | Optional |
| `input` | string | Yes |
| `instructions` | string | Optional |
| `temperature` | number | Optional |

### Configuration

| Property | Type | Required |
| --- | --- | --- |
| `connector-id` | string | Optional |

### Output

| Property | Type | Required |
| --- | --- | --- |
| `categories` | array | Optional |
| `category` | string | Optional |
| `metadata` | object | Yes |
| `rationale` | string | Optional |

### Examples

#### Basic Classification
```yaml
- name: classify_alert
  type: ai.classify
  with:
    input: "{{ steps.fetch_alert.output }}"
    categories: ["Critical", "Warning", "Info"]
```
The default AI connector configured for the workflow will be used.

#### Custom Instructions
```yaml
- name: classify_incident
  type: ai.classify
  with:
    input: "{{ steps.get_incident.output }}"
    categories: ["Security", "Performance", "Network", "Application"]
    instructions: "Focus on root cause type. Ignore transient issues."
```

#### Fallback Category
```yaml
- name: classify_log
  type: ai.classify
  with:
    input: "{{ steps.get_log.output }}"
    categories: ["Authentication", "Authorization", "Data Access"]
    fallbackCategory: "Unknown"
```
When the model cannot confidently match input to defined categories, the fallback category is used.

#### Multi-label Classification with Rationale
```yaml
- name: tag_alert
  type: ai.classify
  with:
    input: "{{ steps.alert_details.output }}"
    categories: ["High Priority", "Security", "Performance", "User Impacting"]
    allowMultipleCategories: true
    includeRationale: true
    instructions: "Select all applicable tags"
```
When `allowMultipleCategories` is true, the output includes a `categories` array. When `includeRationale` is true, the output includes a `rationale` field.

#### Custom Connector with Temperature
```yaml
- name: classify_ticket
  type: ai.classify
  connector-id: "custom-classifier-model"
  with:
    input: "{{ steps.ticket_description.output }}"
    categories: ["Bug", "Feature Request", "Support"]
    temperature: 0.1
    instructions: "Prefer 'Bug' if any technical issue mentioned"
```

#### Use classification in subsequent steps
```yaml
- name: classify_severity
  type: ai.classify
  with:
    input: "{{ steps.get_incident_details.output }}"
    categories: ["Critical", "High", "Medium", "Low"]
    includeRationale: true
- name: notify_team
  type: http
  with:
    url: "https://api.example.com/notify"
    body: 
      severity: "{{ steps.classify_severity.output.category }}"
      reason: "{{ steps.classify_severity.output.rationale }}"
```

## AI Prompt

The ai.prompt step sends a prompt to an AI connector and returns the response. The response can be referenced in later steps using template syntax like `{{ steps.stepName.output }}`.

### Input

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `prompt` | string | Yes |  |
| `schema` | unknown | Optional | The schema for the output of the step. |
| `systemPrompt` | string | Optional |  |
| `temperature` | number | Optional |  |

### Configuration

| Property | Type | Required |
| --- | --- | --- |
| `connector-id` | string | Optional |

### Examples

#### Basic AI prompt
```yaml
- name: ask_ai
  type: ai.prompt
  with:
    prompt: "What is the weather like today?"
```
The default AI connector configured for the workflow will be used.

#### AI prompt with dynamic input
```yaml
- name: analyze_data
  type: ai.prompt
  connector-id: ai_connector
  with:
    prompt: "Analyze this data: {{ steps.previous_step.output }}"
```

#### AI prompt with structured output schema. 
Output schema must be a valid JSON Schema object.
See this [JSON Schema reference](https://json-schema.org/learn/getting-started-step-by-step) for details.
```yaml
- name: extract_info
  type: ai.prompt
  connector-id: my-ai-connector
  with:
    prompt: "Extract key information from this text: {{ workflow.input }}"
    schema:
      type: "object"
      properties:
        summary:
          type: "string"
        key_points:
          type: "array"
          items:
            type: "string"
```

#### AI prompt with structured output schema (JSON object syntax)
See this [JSON Schema reference](https://json-schema.org/learn/getting-started-step-by-step) for details.
```yaml
- name: extract_info
  type: ai.prompt
  connector-id: my-ai-connector
  with:
    prompt: "Extract key information from this text: {{ workflow.input }}"
    schema: {
      "type":"object",
      "properties":{
        "summary":{
          "type":"string"
        },
        "key_points":{
          "type":"array",
          "items":{
            "type":"string"
          }
        }
      }
```

#### Use AI response in subsequent steps
```yaml
- name: get_recommendation
  type: ai.prompt
  connector-id: "my-ai-connector"
  with:
    prompt: "Provide a recommendation based on this data"
- name: process_recommendation
  type: http
  with:
    url: "https://api.example.com/process"
    body: "{{ steps.get_recommendation.output }}"
```

## AI Summarize

The ai.summarize step generates a concise summary of the provided content using an AI connector. The summary can be referenced in later steps using template syntax.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `input` | string | Yes |
| `instructions` | string | Optional |
| `maxLength` | integer | Optional |
| `temperature` | number | Optional |

### Configuration

| Property | Type | Required |
| --- | --- | --- |
| `connector-id` | string | Optional |

### Output

| Property | Type | Required |
| --- | --- | --- |
| `content` | string | Yes |
| `metadata` | object | Optional |

### Examples

#### Basic Summarization
```yaml
- name: summarize_logs
  type: ai.summarize
  with:
    input: "{{ steps.fetch_logs.output }}"
```
The default AI connector configured for the workflow will be used.

#### Data Summarization
```yaml
- name: summarize_alerts
  type: ai.summarize
  with:
    input: "{{ steps.fetch_alerts.output }}"
```
Supports objects and arrays as input.

#### Custom Instructions
```yaml
- name: summarize_alerts
  type: ai.summarize
  with:
    input: "{{ steps.get_alerts.output }}"
    instructions: "Use bullet points. Focus on root cause. Limit to 3 key points."
```

#### Length Control
```yaml
- name: summarize_for_pagerduty
  type: ai.summarize
  with:
    input: "{{ steps.error_details.output }}"
    maxLength: 100
    instructions: "One sentence summary suitable for alert title"
```

#### Use AI summary in subsequent steps
```yaml
- name: summarize_incident
  type: ai.summarize
  with:
    input: "{{ steps.get_incident_details.output }}"
    instructions: "Concise summary for notification"
- name: send_notification
  type: http
  with:
    url: "https://api.example.com/notify"
    body: "{{ steps.summarize_incident.output.content }}"
```

## Run Agent

The agentBuilder.runAgent step allows you to invoke an AI agent within your workflow. The agent will process the input message and return a response, optionally using tools and maintaining conversation context. To receive structured output, provide a JSON schema that defines the expected response format.

### Input

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `attachments` | array | Optional | Optional attachments to provide to the agent. |
| `conversation_id` | string | Optional | Optional existing conversation ID to continue a previous conversation. |
| `message` | string | Yes | The user input message to send to the agent. |
| `schema` | unknown | Optional | The schema for the output of the agent. |

### Configuration

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `agent-id` | string | Optional | The ID of the agent to chat with. Defaults to the default Elastic AI agent. |
| `connector-id` | string | Optional | The ID of the connector to use. Defaults to the default GenAI connector. Mutually exclusive with `inference-id`. |
| `create-conversation` | boolean | Optional | When true, creates a conversation for the step. |
| `inference-id` | string | Optional | The inference endpoint ID to use. Mutually exclusive with `connector-id`; defaults apply when both are omitted. |

### Output

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `conversation_id` | string | Optional | Conversation ID associated with this step execution. Present when create_conversation is enabled or conversation_id is provided. |
| `message` | string | Yes | The text response from the agent. When schema is provided, contains a string version of the structured output |
| `structured_output` | unknown | Optional | The structured output from the agent. Only here when schema was provided |

### Examples

#### Basic agent invocation
```yaml
- name: run_agent
  type: ai.agent
  with:
    message: "Analyze the following data and provide insights"
```

#### Use a specific agent
```yaml
- name: custom_agent
  type: ai.agent
  agent-id: "my-custom-agent"
  with:
    message: "{{ workflow.input.message }}"
```

#### Use an inference endpoint (mutually exclusive with connector-id)
```yaml
- name: run_with_inference
  type: ai.agent
  inference-id: "my-inference-endpoint-id"
  with:
    message: "Summarize the findings."
```

#### Create a conversation and reuse it in a follow-up step
```yaml
- name: initial_analysis
  type: ai.agent
  agent-id: "my-custom-agent"
  create-conversation: true
  with:
    message: "Analyze the event and suggest next steps. {{ event | json }}"

- name: followup
  type: ai.agent
  agent-id: "my-custom-agent"
  with:
    conversation_id: "{{ steps.initial_analysis.output.conversation_id }}"
    message: "Continue from the previous analysis and complete any missing steps."
```

#### Get structured output using a JSON schema
```yaml
- name: extract_person_data
  type: ai.agent
  with:
    message: "Extract information about famous scientists from the text"
    schema:
      title: Person Array
      type: array
      items:
        title: Person
        type: object
        properties:
          name:
            type: string
            description: The person's first name
          surname:
            type: string
            description: The person's last name
          field:
            type: string
            description: Their field of study
        required:
          - name
          - surname
```

When a schema is provided, the agent's response will be available in `output.structured_output` as a typed object, while `output.message` will contain a string representation of the structured output.

#### Structured output with simple object schema
```yaml
- name: analyze_sentiment
  type: ai.agent
  with:
    message: "Analyze the sentiment of this customer feedback: {{ feedback }}"
    schema:
      type: object
      properties:
        sentiment:
          type: string
          enum: [positive, negative, neutral]
          description: Overall sentiment classification
        confidence:
          type: number
          description: Confidence score between 0 and 1
        key_phrases:
          type: array
          items:
            type: string
          description: Important phrases that influenced the sentiment
      required:
        - sentiment
        - confidence
```
