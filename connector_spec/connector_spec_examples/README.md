# Stack Connectors 2.0 - Real Connector Examples

This directory contains **real-world connector implementations** based on actual connectors from Kibana's `stack_connectors` plugin. These examples demonstrate how the spec is applied in production scenarios.

> ⚠️ **All examples are based on real connectors** - no synthetic/minimal examples. Each example references the actual implementation in the Kibana codebase.

---

## 📁 Files

| File | Lines | Description | Real Connector Path |
|------|-------|-------------|---------------------|
| **`slack_api.ts`** | ~240 | Slack Web API & Webhooks | `x-pack/.../slack_api/` |
| **`webhook.ts`** | ~270 | Generic HTTP webhook connector | `x-pack/.../webhook/` |
| **`openai.ts`** | ~320 | OpenAI, Azure AI, and compatible | `x-pack/.../openai/` |
| **`bedrock.ts`** | ~270 | Amazon Bedrock (AWS AI) | `x-pack/.../bedrock/` |
| **`jira.ts`** | ~280 | Jira ticketing system | `x-pack/.../jira/` |
| **`index.ts`** | ~120 | Re-exports all examples | - |

**Total**: 5 real connectors, ~1,500 lines of examples

---

## 🎯 Example Overview

### 1. Slack API (`slack_api.ts`)

**What it demonstrates**:
- ✅ Multiple auth methods (Bearer token vs Webhook URL)
- ✅ Dynamic dropdown options (channels loaded from API)
- ✅ Header-based rate limiting
- ✅ Cursor-based pagination
- ✅ Action grouping in layout

**Auth Pattern**: Bearer Token OR Webhook URL  
**Actions**: 3 (postMessage, getChannels, searchChannels)  
**Complexity**: Medium

**Real Implementation**: `x-pack/platform/plugins/shared/stack_connectors/server/connector_types/slack_api/`

**Use When**:
- Building API connectors with multiple related endpoints
- Need dynamic options in forms (e.g., dropdown populated from API)
- Want to support both API key and webhook patterns

---

### 2. Webhook (`webhook.ts`)

**What it demonstrates**:
- ✅ 4 authentication methods (None, Basic, SSL/mTLS, Custom Headers)
- ✅ SSL certificate authentication (CRT+Key and PFX formats)
- ✅ Multiple HTTP methods (POST, PUT, PATCH, GET, DELETE)
- ✅ Conditional field visibility (hide body for GET)
- ✅ Key-value editors for headers and query params

**Auth Pattern**: Flexible (None/Basic/SSL/Headers)  
**Actions**: 1 (execute - flexible HTTP request)  
**Complexity**: High (due to SSL/mTLS)

**Real Implementation**: `x-pack/platform/plugins/shared/stack_connectors/server/connector_types/webhook/`

**Use When**:
- Building generic HTTP connectors
- Need SSL/mTLS certificate authentication
- Want multiple auth options in one connector
- Need conditional field visibility based on user selections

---

### 3. OpenAI (`openai.ts`)

**What it demonstrates**:
- ✅ Multiple providers (OpenAI, Azure AI, Other/compatible)
- ✅ Streaming support (Server-Sent Events)
- ✅ Function calling / tool use (OpenAI format)
- ✅ SSL/PKI for custom providers
- ✅ Different config per provider

**Auth Pattern**: API Key (varies by provider)  
**Actions**: 4 (run, stream, invokeAI, test)  
**Complexity**: High (streaming + function calling)

**Real Implementation**: `x-pack/platform/plugins/shared/stack_connectors/server/connector_types/openai/`

**Use When**:
- Building AI/LLM connectors
- Need streaming response support
- Want function calling capabilities
- Supporting multiple AI providers with one connector

---

### 4. Bedrock (`bedrock.ts`)

**What it demonstrates**:
- ✅ AWS Signature v4 authentication
- ✅ Streaming via AWS SDK
- ✅ Tool calling (Anthropic/Claude format)
- ✅ Multiple foundation models (Claude, Titan, etc.)
- ✅ Rich content support (text + images)

**Auth Pattern**: AWS SigV4 (Access Key + Secret Key)  
**Actions**: 4 (run, invokeAI, converse, converseStream)  
**Complexity**: High (AWS auth + streaming)

**Real Implementation**: `x-pack/platform/plugins/shared/stack_connectors/server/connector_types/bedrock/`

**Use When**:
- Building connectors for AWS services
- Need AWS SigV4 signing
- Working with AI services on AWS
- Need streaming AI responses

---

### 5. Jira (`jira.ts`)

**What it demonstrates**:
- ✅ Basic authentication (email + API token)
- ✅ Multiple sub-actions (7 different operations)
- ✅ Dynamic field loading based on issue type
- ✅ Integration with Kibana Cases
- ✅ Retry policies and rate limiting

**Auth Pattern**: Basic Auth (email + API token)  
**Actions**: 7 (pushToService, getIncident, issues, issue, getFields, issueTypes, fieldsByIssueType)  
**Complexity**: High (many actions)

**Real Implementation**: `x-pack/platform/plugins/shared/stack_connectors/server/connector_types/jira/`

**Use When**:
- Building ticketing system connectors
- Need many related sub-actions
- Want Cases integration
- Need dynamic form building (fields depend on selections)

---

## 🔍 Feature Coverage

### Authentication Methods

| Auth Type | Example Connector | Line Reference |
|-----------|-------------------|----------------|
| **No Auth** | _(not in examples - see server_log connector)_ | - |
| **Basic Auth** | Jira, Webhook | `jira.ts:27`, `webhook.ts:34` |
| **Bearer Token** | Slack, OpenAI | `slack_api.ts:40`, `openai.ts:68` |
| **Custom Headers** | Slack, Webhook | `slack_api.ts:40`, `webhook.ts:140` |
| **OAuth2** | _(not in examples - see crowdstrike connector)_ | - |
| **SSL/mTLS** | Webhook, OpenAI | `webhook.ts:43`, `openai.ts:113` |
| **AWS SigV4** | Bedrock | `bedrock.ts:48` |
| **Webhook URL** | Slack | `slack_api.ts:63` |

### Special Capabilities

| Capability | Example Connector | Line Reference |
|------------|-------------------|----------------|
| **Streaming (SSE)** | OpenAI | `openai.ts:39-45` |
| **Streaming (AWS SDK)** | Bedrock | `bedrock.ts:36-42` |
| **Function Calling (OpenAI)** | OpenAI | `openai.ts:48-54` |
| **Function Calling (Anthropic)** | Bedrock | `bedrock.ts:45-51` |
| **Dynamic Dropdowns** | Slack, Jira | `slack_api.ts:114-129`, `jira.ts:154-168` |
| **Conditional Fields** | Webhook | `webhook.ts:217-223` |
| **Multiple Providers** | OpenAI | `openai.ts:55-144` |

### Policies

| Policy | Example Connector | Line Reference |
|--------|-------------------|----------------|
| **Rate Limiting (Header)** | Slack, Jira | `slack_api.ts:90-96`, `jira.ts:93-98` |
| **Pagination (Cursor)** | Slack | `slack_api.ts:97-102` |
| **Retry (Exponential)** | Webhook, Jira | `webhook.ts:145-151`, `jira.ts:87-92` |

---

## 📊 Comparison Matrix

| Feature | Slack | Webhook | OpenAI | Bedrock | Jira |
|---------|-------|---------|--------|---------|------|
| **Lines** | 240 | 270 | 320 | 270 | 280 |
| **Auth Methods** | 2 | 4 | 3 | 1 | 1 |
| **Actions** | 3 | 1 | 4 | 4 | 7 |
| **Streaming** | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Function Calling** | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Dynamic Options** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **SSL/mTLS** | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Multi-Provider** | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Rate Limiting** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Pagination** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Cases Integration** | ❌ | ✅ | ❌ | ❌ | ✅ |
| **License** | Gold | Gold | Enterprise | Enterprise | Gold |

---

## 🚀 Usage

### Import Individual Examples

```typescript
import { SlackApiConnectorExample } from './connector_spec_examples/slack_api';
import { WebhookConnectorExample } from './connector_spec_examples/webhook';
import { OpenAIConnectorExample } from './connector_spec_examples/openai';
import { BedrockConnectorExample } from './connector_spec_examples/bedrock';
import { JiraConnectorExample } from './connector_spec_examples/jira';
```

### Import All Examples

```typescript
import * as Examples from './connector_spec_examples';

console.log(Examples.SlackApiConnectorExample);
console.log(Examples.WebhookConnectorExample);
// ... etc
```

### Use Auth Pattern from Example

```typescript
import { BedrockConnectorExample } from './connector_spec_examples';
import type { SingleFileConnectorDefinition } from './connector_spec';

// Reuse AWS SigV4 auth pattern
export const MyAWSConnector: SingleFileConnectorDefinition = {
  metadata: {
    id: ".my_aws_connector",
    displayName: "My AWS Service",
    // ...
  },
  // Copy the AWS SigV4 auth schema from Bedrock
  authSchema: BedrockConnectorExample.authSchema,
  // ... rest of connector
};
```

### Study a Specific Pattern

```typescript
// Want to learn streaming?
import { OpenAIConnectorExample } from './connector_spec_examples';
// Look at: capabilities.streaming and actions.stream

// Want to learn SSL/mTLS?
import { WebhookConnectorExample } from './connector_spec_examples';
// Look at: authSchema (method: "ssl")

// Want to learn dynamic dropdowns?
import { SlackApiConnectorExample } from './connector_spec_examples';
// Look at: actions.postMessage.input (channel field with optionsFrom)
```

---

## 🎓 Learning Path

### For New Connector Developers
1. Start with **Slack API** - demonstrates basic patterns clearly
2. Study **Webhook** - shows how to handle multiple auth methods
3. Explore **Jira** - learn multi-action connectors

### For AI Connector Developers
1. Study **OpenAI** - standard OpenAI-compatible pattern
2. Explore **Bedrock** - AWS-specific AI patterns
3. Compare streaming implementations between both

### For Enterprise Connector Developers
1. Study **Jira** - multiple actions, Cases integration
2. Explore **Webhook** - SSL/mTLS for secure enterprise connections
3. Study rate limiting and retry patterns in both

---

## 📝 Implementation References

Each example includes detailed comments with:
- `REFERENCE:` - Path to the actual implementation file
- `WHY:` - Explanation of design decisions
- `USED BY:` - Which real connectors use this pattern

Example:
```typescript
// REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/slack_api/service.ts:131-134
//   Code: `headers: { Authorization: \`Bearer \${token}\`, 'Content-type': 'application/json; charset=UTF-8' }`
// WHY: Slack API requires Bearer token authentication with specific headers
```

---

## 🔗 Related Files

- `../connector_spec.ts` - Main specification (990 lines)
- `../connector_spec_ui.ts` - UI metadata system (180 lines)
- `../README.md` - Project overview

---

## 📈 Statistics

- **Total Examples**: 5 real connectors
- **Total Lines**: ~1,500 lines
- **Auth Methods Covered**: 6 of 8
- **Special Capabilities**: Streaming, Function Calling, Dynamic Options, SSL/mTLS
- **Status**: ✅ Production-Ready

**Coverage**:
- ✅ Basic Auth (Jira, Webhook)
- ✅ Bearer Token (Slack, OpenAI)
- ✅ Custom Headers (Slack, Webhook)
- ✅ SSL/mTLS (Webhook, OpenAI)
- ✅ AWS SigV4 (Bedrock)
- ✅ Webhook URL (Slack)
- ❌ OAuth2 (see Crowdstrike for reference)
- ❌ No Auth (see Server Log for reference)

---

**Last Updated**: November 2025  
**Kibana Version**: 8.x / 9.x  
**Status**: Active Development
