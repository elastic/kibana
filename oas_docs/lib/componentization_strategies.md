# OAS Componentization Strategy Analysis

This document analyzes the 4 key decisions for componentizing OpenAPI schemas, using two real API specifications from Kibana main branch:

1. **Simple Schema**: `/api/actions/connector/{id}` GET - Tests basic componentization with primitives and empty objects
2. **Complex Schema**: `/api/fleet/outputs` POST - Tests componentization with nested properties, top-level `anyOf`, and nested `anyOf`

## Overview

The componentization process extracts inline schemas into reusable components. There are 4 key decisions that affect the output:

1. **Primitives - Extract or Inline?** Should primitive properties (string, number, boolean) be extracted as separate components or kept inline?
2. **Property Removal - All or Keep All?** Should non-extracted properties be removed from parent components or preserved?
3. **Metadata - Strip or Preserve?** Should metadata fields (additionalProperties, default, description, etc.) be stripped or preserved in extracted components?
4. **Empty Objects - Extract or Skip?** Should empty object schemas `{ type: 'object' }` be extracted as components?

## Test Inputs

### Test 1: `/api/actions/connector/{id}` GET Response (Simple Schema)

This test uses a relatively simple API specification with the following structure:

```yaml
paths:
  /api/actions/connector/{id}:
    get:
      operationId: get-actions-connector-id
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                additionalProperties: false
                properties:
                  config:
                    type: object
                    additionalProperties: {}
                  connector_type_id:
                    type: string
                    description: The connector type identifier.
                  id:
                    type: string
                    description: The identifier for the connector.
                  is_connector_type_deprecated:
                    type: boolean
                    description: Indicates whether the connector type is deprecated.
                  is_deprecated:
                    type: boolean
                    description: Indicates whether the connector is deprecated.
                  is_missing_secrets:
                    type: boolean
                    description: Indicates whether the connector is missing secrets.
                  is_preconfigured:
                    type: boolean
                    description: Indicates whether the connector is preconfigured.
                  is_system_action:
                    type: boolean
                    description: Indicates whether the connector is used for system actions.
                  name:
                    type: string
                    description: The name of the connector.
                required:
                  - id
                  - name
                  - connector_type_id
                  - is_preconfigured
                  - is_deprecated
                  - is_system_action
                  - is_connector_type_deprecated
```

### Test 2: `/api/fleet/outputs` POST Request (Complex Schema)

This test uses a complex API specification with nested structures and composition types:

```yaml
paths:
  /api/fleet/outputs:
    post:
      requestBody:
        content:
          application/json:
            schema:
              anyOf:  # Top-level anyOf
                - type: object
                  properties:
                    name: { type: string }
                    type: { type: string, enum: ['elasticsearch'] }
                    hosts: { type: array, items: { type: string } }
                    secrets:  # Nested object property
                      type: object
                      properties:
                        ssl:  # Nested object property
                          type: object
                          properties:
                            key:  # Nested anyOf
                              anyOf:
                                - type: object
                                  properties:
                                    id: { type: string }
                                    hash: { type: string }
                                - type: string
                    shipper:  # Nested object property
                      type: object
                      properties:
                        compression_level: { type: number }
                - type: object
                  properties:
                    name: { type: string }
                    type: { type: string, enum: ['kafka'] }
                    hosts: { type: array }
```

This complex schema tests:
- **Top-level `anyOf`** - Multiple output types (elasticsearch vs kafka)
- **Nested object properties** - `secrets`, `secrets.ssl`, `shipper` with their own properties
- **Nested `anyOf`** - `secrets.ssl.key` can be either an object or a string
- **Multiple levels of nesting** - Up to 4 levels deep (request → anyOf item → secrets → ssl → key)

## Decision 1: Primitives - Extract or Inline?

### Extract Primitives: `false` (Current Implementation)

- **Behavior**: Primitive properties like `id`, `connector_type_id`, `name` remain inline in their parent component
- **Component Count**: Lower - only complex objects are extracted
- **Readability**: Higher - full structure visible in one place
- **Reusability**: Lower - primitives can't be reused across components

**Example Output:**

```yaml
components:
  schemas:
    ApiActionsConnector_Get_Response_200:
      type: object
      properties:
        id:
          type: string
          description: The identifier for the connector.
        connector_type_id:
          type: string
          description: The connector type identifier.
        config:
          $ref: '#/components/schemas/ApiActionsConnector_Get_Response_200_Config'
```

### Extract Primitives: `true` (Test Expectation)

- **Behavior**: Each primitive property becomes its own component
- **Component Count**: Higher - one component per primitive property
- **Readability**: Lower - need to follow references to see full structure
- **Reusability**: Higher - primitives can be reused, but this is rarely needed

**Example Output:**

```yaml
components:
  schemas:
    ApiActionsConnector_Get_Response_200:
      type: object
      properties:
        id:
          $ref: '#/components/schemas/ApiActionsConnector_Get_Response_200_Id'
        connector_type_id:
          $ref: '#/components/schemas/ApiActionsConnector_Get_Response_200_ConnectorTypeId'
        config:
          $ref: '#/components/schemas/ApiActionsConnector_Get_Response_200_Config'
    ApiActionsConnector_Get_Response_200_Id:
      type: string
      description: The identifier for the connector.
    ApiActionsConnector_Get_Response_200_ConnectorTypeId:
      type: string
      description: The connector type identifier.
```

### Recommendation

**Keep primitives inline** (`extractPrimitives: false`). Extracting primitives creates unnecessary complexity without significant benefit. Primitive types are already well-defined in OpenAPI and don't benefit from componentization.

## Decision 2: Property Removal - All or Keep All?

### Remove Properties: `false` (Current Implementation)

- **Behavior**: After extracting a nested object, the property remains in the parent with a `$ref`
- **Component Count**: Same as `true`
- **Readability**: Higher - parent component shows all properties
- **Structure**: Parent acts as a complete interface definition

**Example Output:**

```yaml
components:
  schemas:
    ApiActionsConnector_Get_Response_200:
      type: object
      additionalProperties: false
      properties:
        config:
          $ref: '#/components/schemas/ApiActionsConnector_Get_Response_200_Config'
        connector_type_id:
          type: string
          description: The connector type identifier.
        id:
          type: string
          description: The identifier for the connector.
    ApiActionsConnector_Get_Response_200_Config:
      type: object
      additionalProperties: {}
```

### Remove Properties: `true` (Test Expectation)

- **Behavior**: After extracting a nested object, the property is removed from the parent
- **Component Count**: Same as `false`
- **Readability**: Lower - parent component doesn't show extracted properties
- **Structure**: Parent becomes incomplete, requiring navigation to child components

**Example Output:**

```yaml
components:
  schemas:
    ApiActionsConnector_Get_Response_200:
      type: object
      additionalProperties: false
      properties:
        connector_type_id:
          type: string
          description: The connector type identifier.
        id:
          type: string
          description: The identifier for the connector.
        # config property removed after extraction
    ApiActionsConnector_Get_Response_200_Config:
      type: object
      additionalProperties: {}
```

### Recommendation

**Keep properties in parent** (`removeProperties: false`). Removing properties makes the parent component incomplete and harder to understand. The parent should serve as a complete interface definition.

## Decision 3: Metadata - Strip or Preserve?

### Preserve Metadata: `true` (Current Implementation)

- **Behavior**: Metadata fields like `additionalProperties`, `default`, `description` are preserved in extracted components
- **Validation**: Complete - all validation rules preserved
- **Documentation**: Complete - descriptions available in components
- **Component Size**: Larger - includes all metadata

**Example Output:**

```yaml
components:
  schemas:
    ApiActionsConnector_Get_Response_200_Config:
      type: object
      additionalProperties: {}
```

### Preserve Metadata: `false` (Test Expectation)

- **Behavior**: Only structural fields (`type`, `properties`, `items`, etc.) are preserved
- **Validation**: Incomplete - loses validation rules like `additionalProperties: false`
- **Documentation**: Incomplete - loses descriptions
- **Component Size**: Smaller - only structural information

**Example Output:**

```yaml
components:
  schemas:
    ApiActionsConnector_Get_Response_200_Config:
      type: object
      # additionalProperties, default, description removed
```

### Recommendation

**Preserve metadata** (`preserveMetadata: true`). Stripping metadata loses important validation rules and documentation. Fields like `additionalProperties: false` are critical for validation, and `description` fields help developers understand the API.

## Decision 4: Empty Objects - Extract or Skip?

### Extract Empty: `false` (Current Implementation)

- **Behavior**: Empty objects `{ type: 'object' }` are not extracted as components
- **Component Count**: Lower - empty objects remain inline
- **Readability**: Higher - empty objects visible in context
- **Reusability**: Lower - but empty objects rarely need reuse

**Example Output:**

```yaml
components:
  schemas:
    ApiActionsConnector_Get_Response_200:
      type: object
      additionalProperties: false
      properties:
        config:
          type: object
          additionalProperties: {}
          # Empty object remains inline
```

### Extract Empty: `true` (Test Expectation)

- **Behavior**: Empty objects are extracted as separate components
- **Component Count**: Higher - one component per empty object
- **Readability**: Lower - need to follow reference to see it's empty
- **Reusability**: Higher - but empty objects rarely need reuse

**Example Output:**

```yaml
components:
  schemas:
    ApiActionsConnector_Get_Response_200:
      type: object
      additionalProperties: false
      properties:
        config:
          $ref: '#/components/schemas/ApiActionsConnector_Get_Response_200_Config'
    ApiActionsConnector_Get_Response_200_Config:
      type: object
      additionalProperties: {}
```

### Recommendation

**Skip empty objects** (`extractEmpty: false`). Extracting empty objects adds complexity without benefit. Empty objects don't have reusable structure, and keeping them inline makes the schema clearer.

## Impact Analysis Summary

| Decision | Option | Component Count | Readability | Validation | Reusability | Recommendation |
|----------|--------|----------------|-------------|------------|-------------|----------------|
| **Primitives** | Extract | High | Low | Same | High (rarely needed) | ❌ Keep inline |
| | Inline | Low | High | Same | Low | ✅ **Recommended** |
| **Property Removal** | Remove | Same | Low | Same | Same | ❌ Keep in parent |
| | Keep | Same | High | Same | Same | ✅ **Recommended** |
| **Metadata** | Strip | Same | Same | **Incomplete** | Same | ❌ Preserve |
| | Preserve | Same | Same | **Complete** | Same | ✅ **Recommended** |
| **Empty Objects** | Extract | High | Low | Same | High (rarely needed) | ❌ Skip |
| | Skip | Low | High | Same | Low | ✅ **Recommended** |

## Recommended Strategy

Based on the analysis, the recommended strategy is:

```javascript
{
  extractPrimitives: false,    // Keep primitives inline
  removeProperties: false,     // Keep properties in parent
  preserveMetadata: true,      // Preserve all metadata
  extractEmpty: false          // Skip empty objects
}
```

This strategy:

- ✅ Maintains readability by keeping full structure visible
- ✅ Preserves complete validation rules
- ✅ Keeps component count reasonable
- ✅ Provides complete documentation
- ✅ Follows OpenAPI best practices

## Running the Tests

To see the differences between strategies, run:

```bash
npm test -- componentize.connector.test.js
```

This will run both test suites:

1. **Simple Schema Tests** (`/api/actions/connector/{id}` GET)
   - 16 strategy combination tests
   - 4 detailed strategy analysis tests

2. **Complex Schema Tests** (`/api/fleet/outputs` POST)
   - 16 strategy combination tests
   - 4 detailed strategy analysis tests
   - 1 nested `anyOf` extraction verification test

All tests generate output files for all 16 strategy combinations, allowing you to compare:

- Component counts (simple vs complex schemas)
- Component structures (nested vs flat)
- Property preservation (especially important for nested structures)
- Metadata preservation (critical for validation rules)
- Nested composition type handling (`anyOf` at multiple levels)

### Test 1: `/api/actions/connector/{id}` GET (Simple Schema)

The simple schema test includes:

- Primitive properties (id, connector_type_id, name, boolean flags)
- An empty object property (`config` with `additionalProperties: {}`)
- Metadata fields (`additionalProperties: false`, `description` fields)
- Required fields array

### Test 2: `/api/fleet/outputs` POST (Complex Schema)

The complex schema test includes:

- Top-level `anyOf` with multiple output types
- Nested object properties (`secrets`, `secrets.ssl`, `shipper`)
- Nested `anyOf` in `secrets.ssl.key` (object or string)
- Multiple levels of nesting (up to 4 levels deep)
- Primitive properties at various nesting levels
- Metadata fields throughout the structure

### Strategy Impact on Simple vs Complex Schemas

The same strategy options affect simple and complex schemas differently:

- **Simple schemas** (connector): Strategy differences are more subtle, mainly affecting component count
- **Complex schemas** (fleet outputs): Strategy differences are more pronounced:
  - `extractPrimitives: true` creates significantly more components due to nested primitives
  - `removeProperties: true` makes nested structures harder to navigate
  - `preserveMetadata: true` is critical for understanding nested validation rules
  - `extractEmpty: false` keeps the structure cleaner when dealing with deep nesting

## Next Steps

1. Run the test suite to generate actual output for all strategies
2. Compare the generated components with code generator requirements
3. Validate that the recommended strategy works with target code generators
4. Update the default strategy in `componentize.js` if needed
