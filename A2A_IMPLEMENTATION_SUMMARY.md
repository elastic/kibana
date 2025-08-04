# A2A Server Implementation Summary

## Overview

I have successfully implemented a complete A2A (Agent-to-Agent) server for the onechat plugin following the official a2a-js package specification. This implementation enables Kibana's onechat agents to participate in agent-to-agent communication using the standardized A2A protocol.

## Key Design Decisions

### 1. Stateless Architecture
- **No in-memory task storage** - Each task request is processed independently without maintaining session state
- **Auto-scaling friendly** - Suitable for distributed deployments without session affinity requirements
- **Stateless task lifecycle** - Tasks are executed immediately and return completed/failed status

### 2. Kibana-Native Implementation
- **Uses Kibana HTTP primitives** - No Express.js dependency, fully integrated with Kibana's router system
- **Kibana authentication/authorization** - Leverages existing `apiPrivileges.readOnechat` security model
- **Feature flag controlled** - Uses `onechat:a2a:enabled` UI setting for activation

### 3. Integration with Existing Infrastructure
- **Onechat agent integration** - Exposes the default onechat agent via A2A protocol
- **Tool exposure** - Automatically exposes agent's available tools as A2A skills
- **Minimal custom code** - Leverages existing chat service, tool registry, and agent infrastructure

## Implementation Components

### 1. Protocol Types (`server/types/a2a.ts`)
- Complete A2A protocol type definitions
- AgentCard, Task, Message, Artifact interfaces
- Security schemes and capabilities definitions
- Based on official A2A specification

### 2. Agent Card Builder (`server/utils/create_agent_card.ts`)
- Converts onechat AgentDefinition to A2A AgentCard format
- Dynamically includes available tools as skills
- Provides proper A2A discovery metadata

### 3. HTTP Transport (`server/utils/kibana_a2a_http_transport.ts`)
- Handles HTTP request/response for A2A protocol
- Validates Content-Type headers and request format
- Provides error handling and logging
- Adapted from MCP transport but simplified for A2A

### 4. Task Executor (`server/utils/a2a_task_executor.ts`)
- Stateless task execution using onechat chat service
- Converts A2A requests to onechat format and back
- Error handling and task lifecycle management
- Integrates with existing agent and tool infrastructure

### 5. Route Registration (`server/routes/a2a.ts`)
- Agent card endpoint: `GET /.well-known/agent.json`
- Task submission endpoint: `POST /api/chat/a2a`
- Proper Kibana security and validation
- Feature flag integration

## API Endpoints

### Agent Discovery
```
GET /.well-known/agent.json
```
Returns the agent card for A2A client discovery, including:
- Agent name, description, and capabilities
- Available skills (derived from tools)
- Security requirements
- Protocol version and endpoints

### Task Execution
```
POST /api/chat/a2a
Content-Type: application/json

{
  "id": "task-unique-id",
  "message": {
    "kind": "message",
    "role": "user",
    "messageId": "msg-id",
    "parts": [{"kind": "text", "text": "Your question here"}],
    "taskId": "task-unique-id",
    "contextId": "context-id"
  },
  "contextId": "context-id"
}
```

Returns completed A2A task with agent response.

## Configuration

### Enable A2A Server
Add to `kibana.dev.yml`:
```yaml
uiSettings.overrides:
  onechat:a2a:enabled: true
  onechat:api:enabled: true  # Required for underlying functionality
```

Or via API:
```bash
POST kbn://internal/kibana/settings
{
  "changes": {
    "onechat:a2a:enabled": true,
    "onechat:api:enabled": true
  }
}
```

## Testing the Implementation

### 1. Check Agent Card
```bash
curl -H "Authorization: ApiKey YOUR_API_KEY" \
     http://localhost:5601/.well-known/agent.json
```

### 2. Submit A2A Task
```bash
curl -X POST \
     -H "Authorization: ApiKey YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "id": "test-task-1",
       "message": {
         "kind": "message",
         "role": "user",
         "messageId": "msg-1",
         "parts": [{"kind": "text", "text": "Hello, how can you help me?"}],
         "taskId": "test-task-1",
         "contextId": "ctx-1"
       },
       "contextId": "ctx-1"
     }' \
     http://localhost:5601/api/chat/a2a
```

## Integration with A2A Clients

This implementation is compatible with:
- [Python A2A SDK](https://github.com/google/A2A/tree/main/samples/python)
- [JavaScript A2A SDK](https://github.com/a2aproject/a2a-js)
- Any A2A client following the protocol specification

Example with Python A2A client:
```python
from a2a import A2AClient, A2ACardResolver

# Discover the agent
resolver = A2ACardResolver("http://localhost:5601")
agent_card = resolver.get_agent_card()

# Create client and send task
client = A2AClient(agent_card=agent_card)
task = await client.send_task({
    "id": "task-123",
    "message": {
        "role": "user",
        "parts": [{"text": "What can you do?"}]
    }
})
```

## Files Created/Modified

### New Files:
- `server/types/a2a.ts` - A2A protocol types
- `server/utils/create_agent_card.ts` - Agent card builder
- `server/utils/kibana_a2a_http_transport.ts` - HTTP transport
- `server/utils/a2a_task_executor.ts` - Task executor

### Modified Files:
- `server/routes/a2a.ts` - Complete rewrite with A2A routes
- `server/routes/index.ts` - Added A2A route registration
- `server/ui_settings.ts` - Added A2A server setting
- `common/constants.ts` - Already had A2A constant
- `README.md` - Added A2A server documentation

## Security Considerations

- **Authentication**: Uses Kibana's existing API key/session authentication
- **Authorization**: Requires `apiPrivileges.readOnechat` permission
- **Input validation**: Strict JSON schema validation on requests
- **Error handling**: Proper error responses without sensitive data leakage
- **HTTPS enforcement**: Recommended for production deployments

## Limitations and Future Enhancements

### Current Limitations:
- **No streaming support** - Tasks return completed results immediately
- **No push notifications** - No webhook support for long-running tasks
- **Single agent exposure** - Only exposes the default onechat agent
- **Basic error handling** - Could be enhanced with more specific error types

### Future Enhancements:
- Add streaming support via Server-Sent Events
- Support multiple agent exposure
- Add push notification support for long-running tasks
- Enhanced artifact support for file/binary outputs
- Agent authentication schemes beyond API keys

## Conclusion

This implementation provides a complete, production-ready A2A server that:
- ✅ Follows official A2A protocol specification
- ✅ Integrates seamlessly with existing onechat infrastructure
- ✅ Uses Kibana-native components and security
- ✅ Supports stateless, scalable deployments
- ✅ Requires minimal custom code and maintenance
- ✅ Compatible with existing A2A client libraries

The implementation enables Kibana's onechat agents to participate in the broader A2A ecosystem while maintaining security, scalability, and integration with existing functionality.
