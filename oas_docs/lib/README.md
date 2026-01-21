### Component Name generator
**Convert Path-to-PascalCase** : Converts API paths like /api/actions/connector/{id} to ApiActionsConnector
**Clean Parameter**: Removes path parameters ({id}, {rule_id}) while preserving meaningful path segments
**Adds Method**: Adds HTTP `method` in `PascalCase` (Get, Post, Put, etc.)
**Request/Response**: Adds "Request" or "Response" based on `context`
**Response Code**: Includes response codes like "200", "404", etc.
**Property Path**: Handles nested object properties for naming details
**Composition Type**: `oneOf`/`anyOf`/`allOf` with 1-based indexing
**Uniqueness**: Adds number suffixes to ensure unique names

#### Examples:
Basic Response Schema:
`/api/actions/connector/{id} GET 200` → `ApiActionsConnector_Get_Response_200`

OneOf/AnyOf Indexing:
`/api/actions/connector GET 200 oneOf` → `ApiActionsConnector_Get_Response_200_1, _2, _3`


Property Schemas:
`Config` property → ApiActionsConnector_Get_Response_200_Config`

Complex Paths:
`/api/alerting/rule/{rule_id}/alert/{alert_id}/_unmute` → `ApiAlertingRuleAlertUnmute_Get_Response_200`
